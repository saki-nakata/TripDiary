import { test, expect } from "./fixtures";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST } from "./helpers/contrast";

// GATE-40グループD（ホームフィード）の前倒し対応。2026-08-01追記: 実機確認で
// ホーム画面のフィード部分（投稿カード・カテゴリバッジ・見出し等）が読めない不具合が
// 見つかったため、DR-02当初の想定より前倒しでPR-7bに統合した。回帰防止のため
// 主要なテキスト要素のコントラストをダークモードで確認する。

test.describe("GATE-40グループD前倒し: ホームフィードのダークテーマ対応", () => {
  test("ホーム画面の見出し・投稿カードがダークモードで読める", async ({ page }) => {
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
