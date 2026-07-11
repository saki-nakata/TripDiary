import { test, expect } from "@playwright/test";

const TEST_EMAIL = "test_playwright_plans@example.com";
const TEST_USER = {
  nickname: "プランテストユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

const PLAN_TITLE = `E2Eテストプラン_${Date.now()}`;
const PLAN_TITLE_UPDATED = `${PLAN_TITLE}_更新後`;

let planId = "";

// 各テストがモジュールレベルの `planId` を共有しているため、posts.spec.ts と同様に同一ワーカーでの順次実行を保証する
test.describe.serial("旅行プランの主要フロー（作成 → 詳細表示 → 編集 → 完了切り替え → 削除）", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: TEST_USER });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("プラン作成 → プラン詳細ページへ遷移する", async ({ page }) => {
    await page.goto("/plans/new");

    await page.fill('input[name="title"]', PLAN_TITLE);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/plans") && res.request().method() === "POST"),
      page.getByRole("button", { name: "作成する" }).click(),
    ]);
    expect(response.status()).toBe(201);
    const created = await response.json();
    planId = created.id;

    await expect(page).toHaveURL(`/plans/${planId}`);
    await expect(page.getByRole("heading", { name: PLAN_TITLE })).toBeVisible();
  });

  test("プラン編集 → タイトルが更新される", async ({ page }) => {
    await page.goto(`/plans/${planId}/edit`);

    await page.fill('input[name="title"]', PLAN_TITLE_UPDATED);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/plans/${planId}`) && res.request().method() === "PUT"),
      page.getByRole("button", { name: "更新する" }).click(),
    ]);
    expect(response.status()).toBe(200);

    await expect(page).toHaveURL(`/plans/${planId}`);
    await expect(page.getByRole("heading", { name: PLAN_TITLE_UPDATED })).toBeVisible();
  });

  test("旅行を完了済みにする → 完了バッジが表示される", async ({ page }) => {
    await page.goto(`/plans/${planId}`);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/plans/${planId}/complete`)),
      page.getByTestId("plan-completed-checkbox").click(),
    ]);
    expect(response.status()).toBe(200);

    await expect(page.getByTestId("plan-completed-checkbox")).toBeChecked();
  });

  test("プラン削除 → マイページの旅行プランタブへ遷移する", async ({ page }) => {
    await page.goto(`/plans/${planId}`);

    await page.getByRole("button", { name: "削除", exact: true }).click();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/plans/${planId}`) && res.request().method() === "DELETE"),
      page.getByRole("button", { name: "削除する", exact: true }).click(),
    ]);
    expect(response.status()).toBe(200);

    await expect(page).toHaveURL("/mypage?tab=plans", { timeout: 5000 });
  });
});
