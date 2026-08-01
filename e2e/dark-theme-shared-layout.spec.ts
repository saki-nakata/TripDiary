import { test, expect } from "./fixtures";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST } from "./helpers/contrast";

// PR-7a（GATE-40、DR-02グループA: 共有チェック・レイアウト）の検証。
// ライト/ダーク双方でスクリーンショットを撮り比較できるようにし、
// 主要なテキスト要素についてWCAGのコントラスト比（通常テキスト4.5:1）を自動検証する。

const TEST_EMAIL = "test_playwright_dark_theme@example.com";
const TEST_USER = {
  nickname: "ダークテーマ確認用ユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

test.describe("PR-7a: 共有レイアウトのダークテーマ対応（未ログイン・デスクトップ）", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`未ログイン・デスクトップ幅（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/");

      const loginLink = page.getByRole("link", { name: /ログイン/ });
      const signupLink = page.getByRole("link", { name: /新規登録/ });
      await expect(loginLink).toBeVisible();
      await expect(signupLink).toBeVisible();

      expect(await getContrastRatio(loginLink)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      expect(await getContrastRatio(signupLink)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // テーマ切替トグル（既定「自動」ラベル）のコントラストも確認する
      const autoToggle = page.getByRole("radio", { name: "表示テーマ: 自動" });
      await expect(autoToggle).toBeVisible();
      expect(await getContrastRatio(autoToggle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // フィード本文は他のE2Eが並列に作成するデータで変動するため、共有レイアウトの視覚回帰からは除外する。
      await expect(page).toHaveScreenshot(`guest-desktop-${colorScheme}.png`, { fullPage: false, mask: [page.locator("main")] });
    });

    test(`未ログイン・モバイル幅（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 375, height: 700 });
      await page.goto("/");

      // モバイル幅でも非表示のデスクトップ用aside（GuestSidebarNav）がDOM上に残っているため、
      // 実際に表示されている要素だけに絞り込む
      const searchLabel = page.getByText("検索", { exact: true }).filter({ visible: true });
      const loginLabel = page.getByText("ログイン", { exact: true }).filter({ visible: true });
      await expect(searchLabel).toBeVisible();
      await expect(loginLabel).toBeVisible();

      expect(await getContrastRatio(searchLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      expect(await getContrastRatio(loginLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`guest-mobile-${colorScheme}.png`, { fullPage: false, mask: [page.locator("main")] });
    });
  }
});

test.describe("PR-7a: 共有レイアウトのダークテーマ対応（ログイン後）", () => {
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

  for (const colorScheme of ["light", "dark"] as const) {
    test(`ログイン後・デスクトップ幅、ユーザーメニュー内の表示テーマトグル（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/");

      const activeNavLink = page.getByRole("link", { name: "ホーム" }).first();
      await expect(activeNavLink).toBeVisible();
      expect(await getContrastRatio(activeNavLink)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // ユーザードロップダウンを開き、メニュー項目と表示テーマトグルのコントラストを確認する
      await page.getByRole("button", { name: TEST_USER.nickname }).click();
      const profileEditLink = page.getByRole("link", { name: "プロフィール編集" });
      await expect(profileEditLink).toBeVisible();
      expect(await getContrastRatio(profileEditLink)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const darkToggle = page.getByRole("radio", { name: "表示テーマ: ダーク" });
      await expect(darkToggle).toBeVisible();
      expect(await getContrastRatio(darkToggle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`authed-desktop-dropdown-${colorScheme}.png`, { fullPage: false, mask: [page.locator("main")] });
    });
  }

  for (const colorScheme of ["light", "dark"] as const) {
    test(`ログイン後・モバイル幅、ユーザーメニュー内の表示テーマトグル（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 375, height: 700 });
      await page.goto("/");

      // デスクトップ用のトリガーボタンもDOM上に残っているため（hidden md:flex）、
      // aria-labelの部分一致で両方拾わないよう表示中の要素だけに絞り込む
      const mobileMenuButton = page.getByRole("button", { name: `${TEST_USER.nickname}のメニュー` }).filter({ visible: true });
      await expect(mobileMenuButton).toBeVisible();
      await mobileMenuButton.click();

      const profileEditLink = page.getByRole("link", { name: "プロフィール編集" }).filter({ visible: true });
      await expect(profileEditLink).toBeVisible();
      expect(await getContrastRatio(profileEditLink)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // モバイルのドロップダウンはラベルを縮小表示する（showLabels compact）ため、
      // デスクトップ版とは別に必ず検証する
      const darkToggle = page.getByRole("radio", { name: "表示テーマ: ダーク" }).filter({ visible: true });
      await expect(darkToggle).toBeVisible();
      expect(await getContrastRatio(darkToggle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`authed-mobile-dropdown-${colorScheme}.png`, { fullPage: false, mask: [page.locator("main")] });
    });
  }

  test("表示テーマトグルでダークを選択すると即座に反映され、リロード後も維持される", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: TEST_USER.nickname }).click();
    await page.getByRole("radio", { name: "表示テーマ: ダーク" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
