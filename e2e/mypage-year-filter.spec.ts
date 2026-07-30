import { test, expect } from "./fixtures";

const TEST_EMAIL = "test_playwright_year_filter@example.com";
const TEST_USER = {
  nickname: "年度フィルターテスト",
  email: TEST_EMAIL,
  password: "Password1234",
};

test.describe.serial("マイページの年度切り替え（自分の投稿・旅行プラン）", () => {
  test.beforeEach(async ({ page, request }) => {
    // Playwrightのretryでも前試行の投稿・プランを残さず、件数アサーションを独立させる。
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: TEST_USER });
    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("自分の投稿タブ: 年度セレクトで絞り込むとカードとカウントバッジが連動する", async ({ page }) => {
    // retry時に同じタイトルの投稿を追加してstrict locatorが失敗しないよう、試行ごとに新しいタイトルを使う。
    const post2025Title = `E2E年度テスト投稿2025_${Date.now()}`;
    const post2026Title = `E2E年度テスト投稿2026_${Date.now()}`;
    const post2025 = await page.request.post("/api/posts", {
      data: {
        title: post2025Title,
        body: "2025年の投稿です。",
        location: "東京都",
        category: "観光",
        visitedAt: "2025-06-01",
      },
    });
    expect(post2025.status()).toBe(201);
    const post2026 = await page.request.post("/api/posts", {
      data: {
        title: post2026Title,
        body: "2026年の投稿です。",
        location: "大阪府",
        category: "グルメ",
        visitedAt: "2026-06-01",
      },
    });
    expect(post2026.status()).toBe(201);

    await page.goto("/mypage?tab=myposts");

    const countBadge = page.locator("h1").getByText(/^\d+$/);
    await expect(page.getByText(post2025Title)).toBeVisible();
    await expect(page.getByText(post2026Title)).toBeVisible();
    await expect(countBadge).toHaveText("2");

    // 年度セレクターはスマホ用・PC用の<select>がCSS表示切替のみで同時にDOM上に存在するため、可視要素に絞る
    await page.locator("select:visible").selectOption("2025");
    await expect(page).toHaveURL("/mypage?tab=myposts&year=2025");

    await expect(page.getByText(post2025Title)).toBeVisible();
    await expect(page.getByText(post2026Title)).not.toBeVisible();
    await expect(countBadge).toHaveText("1");
  });

  test("旅行プランタブ: 完了済みプランの年度セレクトで絞り込める", async ({ page }) => {
    const plan2025Title = `E2E年度テストプラン2025_${Date.now()}`;
    const plan2026Title = `E2E年度テストプラン2026_${Date.now()}`;
    const plan2025Res = await page.request.post("/api/plans", {
      data: { title: plan2025Title, startDate: "2025-05-01" },
    });
    expect(plan2025Res.status()).toBe(201);
    const plan2025 = await plan2025Res.json();
    const plan2026Res = await page.request.post("/api/plans", {
      data: { title: plan2026Title, startDate: "2026-05-01" },
    });
    expect(plan2026Res.status()).toBe(201);
    const plan2026 = await plan2026Res.json();

    // 両方とも完了済みにする（アコーディオンの年度フィルターは完了済みプランのみが対象）
    expect((await page.request.patch(`/api/plans/${plan2025.id}/complete`)).status()).toBe(200);
    expect((await page.request.patch(`/api/plans/${plan2026.id}/complete`)).status()).toBe(200);

    await page.goto("/mypage?tab=plans");
    await page.getByText(/完了済みの旅行プラン/).click();

    await expect(page.getByText(plan2025Title)).toBeVisible();
    await expect(page.getByText(plan2026Title)).toBeVisible();

    // このページの<select>は完了済みプランアコーディオン内の年度セレクターのみ（myposts/reportと異なり複製されない）
    await page.locator("select").selectOption("2025");

    await expect(page.getByText(plan2025Title)).toBeVisible();
    await expect(page.getByText(plan2026Title)).not.toBeVisible();
  });
});
