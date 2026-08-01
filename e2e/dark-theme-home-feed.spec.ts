import { test, expect } from "./fixtures";
import { pickDate } from "./utils/dateField";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST } from "./helpers/contrast";

// GATE-40グループD（ホームフィード）の前倒し対応。2026-08-01追記: 実機確認で
// ホーム画面のフィード部分（投稿カード・カテゴリバッジ・見出し等）が読めない不具合が
// 見つかったため、DR-02当初の想定より前倒しでPR-7bに統合した。回帰防止のため
// 主要なテキスト要素のコントラストをダークモードで確認する。
//
// CIの共有DBは他のE2E仕様の実行順序次第で投稿が1件も存在しない状態になり得るため
// （実行順序に依存した非決定性）、他specの投稿データに依存せず自分で1件作成する。

const TEST_EMAIL = "test_playwright_dark_theme_home_feed@example.com";
const TEST_USER = {
  nickname: "ホームフィード確認用",
  email: TEST_EMAIL,
  password: "Password1234",
};
const POST = {
  title: `ダークモード確認用投稿_${Date.now()}`,
  body: "ホームフィードのダークテーマ確認用に作成したテスト投稿です。",
  location: "東京都",
  category: "観光",
};

test.describe("GATE-40グループD前倒し: ホームフィードのダークテーマ対応", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: TEST_USER });
  });

  test("ホーム画面の見出し・投稿カードがダークモードで読める", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    // 他specの投稿データの有無に依存しないよう、自分専用の投稿を1件作成する
    await page.goto("/posts/new");
    await page.fill('input[name="title"]', POST.title);
    await page.fill('textarea[name="body"]', POST.body);
    await page.selectOption('select[name="location"]', POST.location);
    await page.selectOption('select[name="category"]', POST.category);
    await pickDate(page, "visited-at-field", "2026-01-01");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\?highlighted=/);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    const heading = page.getByRole("heading", { name: "人気の旅スポット" });
    await expect(heading).toBeVisible();
    expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const postCard = page.locator('[data-testid="post-card"]').first();
    await expect(postCard).toBeVisible();

    const title = postCard.locator("h3").first();
    expect(await getContrastRatio(title)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const areaHeading = page.getByRole("heading", { name: "エリアから探す" });
    await expect(areaHeading).toBeVisible();
    expect(await getContrastRatio(areaHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const categoryHeading = page.getByRole("heading", { name: "カテゴリから探す" });
    await expect(categoryHeading).toBeVisible();
    expect(await getContrastRatio(categoryHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });
});
