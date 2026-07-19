import { test, expect } from "@playwright/test";

const TEST_EMAIL = "test_playwright_plans@example.com";
const TEST_USER = {
  nickname: "プランテストユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

const PLAN_TITLE = `E2Eテストプラン_${Date.now()}`;
const PLAN_TITLE_UPDATED = `${PLAN_TITLE}_更新後`;
const MAP_POST_TITLE = `E2E地図テスト投稿_${Date.now()}`;
const MAP_PLAN_TITLE = `E2E地図テストプラン_${Date.now()}`;

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

    // 未完了時のチェックボックスは sr-only（画面上は非表示）でラベルクリックのみで
    // トグルする設計のため、Playwrightの可視性チェックを回避して force クリックする
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/plans/${planId}/complete`)),
      page.getByTestId("plan-completed-checkbox").click({ force: true }),
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

  test("プラン詳細 → 緯度経度ありのスポットを含む場合にスポット地図が表示される", async ({ page }) => {
    // 地図描画（PlanMapView）の検証には緯度経度を持つ投稿が必要。
    // Leaflet地図のクリックで座標を設定するUI操作はタイル読み込みに依存し不安定なため、
    // 座標の設定自体はAPIで直接行い、地図が表示されるかの検証に焦点を絞る
    const postRes = await page.request.post("/api/posts", {
      data: {
        title: MAP_POST_TITLE,
        body: "地図テスト用の投稿です。",
        location: "東京都",
        category: "観光",
        visitedAt: "2026-01-01",
        lat: 35.681236,
        lng: 139.767125,
      },
    });
    expect(postRes.status()).toBe(201);

    await page.goto("/plans/new");
    await page.fill('input[name="title"]', MAP_PLAN_TITLE);
    await page.fill('input[placeholder="スポット名・キーワードで検索"]', MAP_POST_TITLE);
    await expect(page.getByRole("button", { name: new RegExp(MAP_POST_TITLE) })).toBeVisible();
    await page.getByRole("button", { name: new RegExp(MAP_POST_TITLE) }).click();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/plans") && res.request().method() === "POST"),
      page.getByRole("button", { name: "作成する" }).click(),
    ]);
    expect(response.status()).toBe(201);
    const createdPlan = await response.json();

    await expect(page).toHaveURL(`/plans/${createdPlan.id}`, { timeout: 15000 });
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15000 });
  });
});
