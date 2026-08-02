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

// 投稿一覧はmainをマスクしているが、投稿数で変わるページ全体の高さは右端の
// スクロールバーにも現れる。スクロールバーは共有レイアウトの比較対象ではないため、
// 撮影時だけ隠して、DB上の投稿量によるvisual baselineの揺れを除外する。
async function expectSharedLayoutScreenshot(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.addStyleTag({ content: "html, body { overflow: hidden !important; }" });
  await expect(page).toHaveScreenshot(name, { fullPage: false, mask: [page.locator("main")] });
}

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
      await expectSharedLayoutScreenshot(page, `guest-desktop-${colorScheme}.png`);
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

      await expectSharedLayoutScreenshot(page, `guest-mobile-${colorScheme}.png`);
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
    // 認証URLのホスト名が環境ごとに異なっても、ログイン後の遷移先パスを検証する。
    await expect(page).toHaveURL((url) => url.pathname === "/", { timeout: 15000 });
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

      await expectSharedLayoutScreenshot(page, `authed-desktop-dropdown-${colorScheme}.png`);
    });
  }

  test("ログイン後・タブレット幅、表示テーマのラベルが横書きで収まる", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/");

    await page.getByRole("button", { name: TEST_USER.nickname }).click();

    for (const label of ["ライト", "ダーク", "自動"]) {
      const toggle = page.getByRole("radio", { name: `表示テーマ: ${label}` });
      const labelElement = toggle.getByText(label, { exact: true });
      await expect(toggle).toBeVisible();
      await expect(labelElement).toHaveCSS("white-space", "nowrap");

      const [toggleBox, labelBox] = await Promise.all([toggle.boundingBox(), labelElement.boundingBox()]);
      expect(toggleBox).not.toBeNull();
      expect(labelBox).not.toBeNull();
      expect(labelBox!.x).toBeGreaterThanOrEqual(toggleBox!.x);
      expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(toggleBox!.x + toggleBox!.width);
    }
  });

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

      await expectSharedLayoutScreenshot(page, `authed-mobile-dropdown-${colorScheme}.png`);
    });
  }

  test("表示テーマトグルでダークを選択すると即座に反映され、リロード後も維持される", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: TEST_USER.nickname }).click();

    // 選択直後の楽観更新（同期）と、デバウンス後のPATCH永続化（非同期）を両方確認する。
    // リロード前にPATCH完了を待たないと、RootLayoutがDB反映前の古い値を解決してしまう
    const patchResponse = page.waitForResponse((res) => res.url().includes("/api/me/theme") && res.request().method() === "PATCH");
    await page.getByRole("radio", { name: "表示テーマ: ダーク" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect((await patchResponse).ok()).toBe(true);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

// ログイン直後のアバター長押しヒントトースト（Sidebar.tsx）は、ボトムナビ自体が
// `md:hidden`（768px未満のみ表示）のアイコン専用導線のため、それ以外の幅では意味がない。
// 以前はビューポート判定を持たず全幅で表示されてしまう実装バグがあり、PR-7cのダーク
// テーマE2Eでスクリーンショットへ非決定的に写り込む形で発覚した（matchMediaで是正済み）。
// 既存の「ログイン後」describeはbeforeEachのログイン自体が既定ビューポート（デスクトップ幅）で
// 実行されフラグを消費してしまうため、ここではビューポートを設定してからログインする
// 専用のヘルパー・専用アカウントを使う
const HINT_TEST_EMAIL = "test_playwright_dark_theme_hint_boundary@example.com";
const HINT_TEST_USER = {
  nickname: "ヒント境界確認用ユーザー",
  email: HINT_TEST_EMAIL,
  password: "Password1234",
};

test.describe("PR-7c: ログイン直後ヒントトーストの表示境界（ボトムナビ表示幅のみ）", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(HINT_TEST_EMAIL)}`);
  });

  async function loginAtViewport(page: import("@playwright/test").Page, width: number) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await page.fill("#email", HINT_TEST_USER.email);
    await page.fill("#password", HINT_TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL((url) => url.pathname === "/", { timeout: 15000 });
  }

  test("767px（ボトムナビ表示幅）ではヒントトーストが表示される", async ({ request, page }) => {
    await request.post("/api/auth/signup", { data: HINT_TEST_USER }).catch(() => {});
    await loginAtViewport(page, 767);
    // トーストは2.5秒で自動的に消えるため、タイムアウトを延ばすだけでは根本対応にならない
    // （ハイドレーションが遅い環境では、アサーション開始前に表示ウィンドウを過ぎてしまう）。
    // Sidebarのeffect（sessionStorageの"justLoggedIn"を読んでtoastを出し、即座に消費する）が
    // 実行済みであることをまず同期点として待ってから、表示→自動消滅を検証する
    await page.waitForFunction(() => sessionStorage.getItem("justLoggedIn") === null);
    const hint = page.getByText("下のアイコンを長押しすると名前が表示されます");
    await expect(hint).toBeVisible();
    await expect(hint).toBeHidden();
  });

  test("768px（ボトムナビ非表示幅）ではヒントトーストが表示されない", async ({ request, page }) => {
    await request.post("/api/auth/signup", { data: HINT_TEST_USER }).catch(() => {});
    await loginAtViewport(page, 768);
    // Sidebarのeffectが実行される前はトーストがまだDOMにないため、その時点で
    // not.toBeVisible()を評価すると実装が常に通ってしまう。フラグ消費を同期点にしてから
    // トーストが生成されていないことを確認する。
    await page.waitForFunction(() => sessionStorage.getItem("justLoggedIn") === null);
    await expect(page.getByText("下のアイコンを長押しすると名前が表示されます")).toHaveCount(0);
  });
});
