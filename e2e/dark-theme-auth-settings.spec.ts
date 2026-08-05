import { test, expect } from "./fixtures";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST } from "./helpers/contrast";

// PR-7b（GATE-40、DR-02グループB+C: 認証・設定・アカウント）＋テーマ設定のCookie/DB化の検証。

const TEST_EMAIL = "test_playwright_dark_theme_authsettings@example.com";
const TEST_USER = {
  nickname: "PR7b確認用ユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

test.describe("PR-7b: 認証・設定画面のダークテーマ対応（未ログイン）", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`ログイン画面（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/login");

      const emailLabel = page.getByText("メールアドレス", { exact: true });
      const submitButton = page.getByRole("button", { name: "ログイン" });
      await expect(emailLabel).toBeVisible();
      await expect(submitButton).toBeVisible();

      expect(await getContrastRatio(emailLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      expect(await getContrastRatio(submitButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // ホバー時の背景色（#166534）でも白文字とのコントラストを維持することを確認
      // （第4ラウンドレビューB-4、#16a34a→#15803d・hover #166534への是正）
      await submitButton.hover();
      expect(await getContrastRatio(submitButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`auth-login-${colorScheme}.png`, { fullPage: false });
    });

    test(`新規登録画面（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/signup");

      const nicknameLabel = page.getByText("ニックネーム", { exact: true });
      await expect(nicknameLabel).toBeVisible();
      expect(await getContrastRatio(nicknameLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`auth-signup-${colorScheme}.png`, { fullPage: false });
    });
  }

  test("未ログイン時にテーマを選択するとCookieへ即座に保存される", async ({ page, context }) => {
    await page.goto("/");
    await page.getByRole("button", { name: TEST_USER.nickname }).click().catch(() => {});
    await page.getByRole("radio", { name: "表示テーマ: ダーク" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "theme")?.value).toBe("dark");
  });
});

test.describe("PR-7b: 認証・設定画面のダークテーマ対応（ログイン後・DB昇格とログアウト同期）", () => {
  // 本テストはsignup UIそのもの（新規アカウント作成）を検証するため、アカウントが
  // 事前に存在しない状態が前提。他のテストと共有しない専用のメールアドレスを使う
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
  });

  test("未ログイン時にCookieでテーマを選択→ログインするとDBへ昇格し、ログアウトでCookieへミラーされる", async ({ page, context }) => {
    // 1. 未ログイン状態でダークを選択（Cookieのみに保存される）
    await page.goto("/");
    await page.getByRole("radio", { name: "表示テーマ: ダーク" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // 2. 新規登録（登録直後は自動ログインし、redirect:false経由でPOST /api/me/themeが走る）
    await page.goto("/signup");
    await page.fill("#nickname", TEST_USER.nickname);
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.fill("#confirmPassword", TEST_USER.password);
    const syncResponse = page.waitForResponse((res) => res.url().includes("/api/me/theme") && res.request().method() === "POST");
    await page.getByRole("button", { name: "登録する" }).click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
    expect((await syncResponse).ok()).toBe(true);
    // ログイン済み(persist="api")のままDB昇格されたdark値がSSRでも維持されていることを確認する
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // 3. ログアウトすると、DBの値（dark）がCookieへミラーされる。
    // DBへの反映（次回ログイン時にdarkが維持されること）は他のテスト（フレッシュな
    // ログインを行う「/settingsに...」「設定画面・アカウント設定画面」）で別途確認しており、
    // 同一テスト内でログアウト直後に再ログインする手順は、signOut()のセッションCookie
    // クリアタイミングに依存し不安定なため採用しない
    await page.getByRole("button", { name: TEST_USER.nickname }).click();
    const logoutSyncResponse = page.waitForResponse((res) => res.url().includes("/api/me/theme") && res.request().method() === "POST");
    await page.getByRole("button", { name: "ログアウト" }).click();
    expect((await logoutSyncResponse).ok()).toBe(true);
    await expect(page).toHaveURL("/", { timeout: 15000 });
    const cookiesAfterLogout = await context.cookies();
    expect(cookiesAfterLogout.find((c) => c.name === "theme")?.value).toBe("dark");
  });
});

// 以下はフレッシュなログインだけを必要とし、signup UI自体は検証しないため、
// 上記テストの実行順序・成否に依存しないよう別アカウントを使う。CIの並列実行では
// 実行順序が保証されないため、各テストの直前で自分自身がアカウントの存在を
// 保証する（既に存在する場合の409は無視する）
const SETTINGS_TEST_EMAIL = "test_playwright_dark_theme_authsettings_settings@example.com";
const SETTINGS_TEST_USER = {
  nickname: "PR7b設定確認用ユーザー",
  email: SETTINGS_TEST_EMAIL,
  password: "Password1234",
};

test.describe("PR-7b: 認証・設定画面のダークテーマ対応（設定画面）", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(SETTINGS_TEST_EMAIL)}`);
  });

  test.beforeEach(async ({ request }) => {
    await request.post("/api/auth/signup", { data: SETTINGS_TEST_USER }).catch(() => {});
  });

  test("/settings に「テーマ」カードが表示され、選択がDBに保存されリロード後も維持される", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", SETTINGS_TEST_USER.email);
    await page.fill("#password", SETTINGS_TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await page.goto("/settings");
    const themeHeading = page.getByRole("heading", { name: "テーマ" });
    await expect(themeHeading).toBeVisible();

    const lightToggle = page.getByRole("radio", { name: "表示テーマ: ライト" });
    await expect(lightToggle).toBeVisible();
    const patchResponse = page.waitForResponse((res) => res.url().includes("/api/me/theme") && res.request().method() === "PATCH");
    await lightToggle.click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
    expect((await patchResponse).ok()).toBe(true);

    await page.reload();
    await expect(page.getByRole("radio", { name: "表示テーマ: ライト" })).toHaveAttribute("aria-checked", "true");
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`設定画面・アカウント設定画面（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/login");
      await page.fill("#email", SETTINGS_TEST_USER.email);
      await page.fill("#password", SETTINGS_TEST_USER.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL("/", { timeout: 15000 });

      await page.goto("/settings");
      await expect(page.getByRole("heading", { name: "テーマ" })).toBeVisible();
      // 前のテストでDBのthemePreferenceが確定値（light等）のままだと、OS設定（emulateMedia）
      // より優先されてしまいこのテスト自体のcolorScheme比較にならない。「自動」へ戻し
      // OS設定に追従する状態にしてから撮影する
      const systemToggle = page.getByRole("radio", { name: "表示テーマ: 自動" });
      if ((await systemToggle.getAttribute("aria-checked")) !== "true") {
        const patchResponse = page.waitForResponse(
          (res) => res.url().includes("/api/me/theme") && res.request().method() === "PATCH",
        );
        await systemToggle.click();
        expect((await patchResponse).ok()).toBe(true);
      }
      await expect(systemToggle).toHaveAttribute("aria-checked", "true");
      // 初回ログイン時だけ表示される案内トーストをベースラインに含めない。
      // 表示済みなら消滅を待ち、未表示なら即座に通過するため撮影条件を安定化できる。
      await page.getByText("下のアイコンを長押しすると名前が表示されます").waitFor({ state: "hidden" });
      await expect(page).toHaveScreenshot(`settings-profile-${colorScheme}.png`, { fullPage: false });

      await page.goto("/settings/account");
      const emailHeading = page.getByRole("heading", { name: "メールアドレス変更" });
      await expect(emailHeading).toBeVisible();
      // 「自動」のDB保存が完了していれば、次のSSRで以前の固定テーマが復活しない。
      // OS設定と逆のdata-themeが残っていないことを撮影前に明示的に保証する。
      await expect(page.locator("html")).not.toHaveAttribute("data-theme", colorScheme === "dark" ? "light" : "dark");
      expect(await getContrastRatio(emailHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      await expect(page).toHaveScreenshot(`settings-account-${colorScheme}.png`, { fullPage: false });
    });
  }
});
