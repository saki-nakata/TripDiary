import { test, expect } from "@playwright/test";

const TEST_EMAIL = "test_playwright_report@example.com";
const TEST_USER = {
  nickname: "レポートテストユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

const POST = {
  title: `E2Eレポートテスト投稿_${Date.now()}`,
  body: "Playwrightから作成したテスト投稿です。",
  location: "東京都",
  category: "観光",
};

test.describe.serial("旅行レポートの主要フロー（カード遷移・エリアバッジ）", () => {
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

  test("投稿作成 → 旅行レポートに反映される", async ({ page }) => {
    await page.goto("/posts/new");
    await page.fill('input[name="title"]', POST.title);
    await page.fill('textarea[name="body"]', POST.body);
    await page.selectOption('select[name="location"]', POST.location);
    await page.selectOption('select[name="category"]', POST.category);
    await page.fill('input[name="visitedAt"]', "2026-01-01");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\?highlighted=/);

    await page.goto("/mypage?tab=report");
    await expect(page.getByText("1件", { exact: true }).first()).toBeVisible();
  });

  test("投稿数カード → 投稿数の推移へスクロールする", async ({ page }) => {
    await page.goto("/mypage?tab=report");

    await page.getByRole("button", { name: /投稿数/ }).click();

    await expect(page.getByText(/投稿数の推移/)).toBeInViewport();
  });

  test("訪問スポット数カード → 年別旅行記録へスクロールする", async ({ page }) => {
    await page.goto("/mypage?tab=report");

    await page.getByRole("button", { name: /訪問スポット数/ }).click();

    await expect(page.getByText(/年別旅行記録/)).toBeInViewport();
  });

  test("旅行回数カード → 旅行プランタブへ遷移する", async ({ page }) => {
    await page.goto("/mypage?tab=report");

    await page.getByRole("button", { name: /旅行回数/ }).click();

    await expect(page).toHaveURL("/mypage?tab=plans");
  });

  test("訪問エリアバッジ → 検索ページのエリアタブへ絞り込み遷移する", async ({ page }) => {
    await page.goto("/mypage?tab=report");

    await page.getByRole("link", { name: POST.location, exact: true }).click();

    await expect(page).toHaveURL(`/search?tab=area&location=${encodeURIComponent(POST.location)}`);
    await expect(page.getByRole("button", { name: POST.location })).toHaveClass(/bg-yellow-400/);
  });

  test("年選択 → URLに反映され、ブラウザバックで選択した年が復元される", async ({ page }) => {
    await page.goto("/mypage?tab=report");

    const yearSelect = page.locator("select");
    await yearSelect.selectOption("2026");
    await expect(page).toHaveURL("/mypage?tab=report&year=2026");

    await page.goto("/mypage?tab=plans");
    await page.goBack();

    await expect(page).toHaveURL("/mypage?tab=report&year=2026");
    await expect(yearSelect).toHaveValue("2026");
  });
});
