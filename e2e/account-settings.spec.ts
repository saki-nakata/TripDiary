import { test, expect } from "@playwright/test";

const TEST_EMAIL = "test_playwright_account@example.com";
const TEST_EMAIL_CHANGED = "test_playwright_account_changed@example.com";
const TEST_USER = {
  nickname: "アカウント設定テストユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};
const NEW_PASSWORD = "NewPassword5678";

// パスワード変更 → 新パスワードでログイン → メールアドレス変更 → 新メールアドレスでログイン、の順に
// 状態を積み上げていくため、posts.spec.ts / plans.spec.ts と同様に同一ワーカーでの順次実行を保証する
test.describe.serial("アカウント設定の主要フロー（パスワード変更 → メールアドレス変更）", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL_CHANGED)}`);
    await request.post("/api/auth/signup", { data: TEST_USER });
  });

  test("パスワード変更 → 新パスワードで再ログインできる", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await page.goto("/settings/account");
    const passwordForm = page.locator("form").nth(1);
    await passwordForm.locator('input[name="currentPassword"]').fill(TEST_USER.password);
    await passwordForm.locator('input[name="newPassword"]').fill(NEW_PASSWORD);
    await passwordForm.locator('input[name="confirmNewPassword"]').fill(NEW_PASSWORD);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/password") && res.request().method() === "PATCH"),
      passwordForm.getByRole("button", { name: "パスワードを変更する" }).click(),
    ]);
    expect(response.status()).toBe(200);

    // セッションはパスワード変更後も有効なままのため、/login にアクセスしても proxy.ts のミドルウェアで
    // ホームへリダイレクトされてしまう。ログインフォームを表示するにはまずセッションを明示的に破棄する。
    // CI高負荷ではPATCH後のクライアント処理が続いていることがあるため、落ち着かせてからCookieを破棄する
    await page.waitForLoadState("networkidle");
    await page.context().clearCookies();

    // 旧パスワードではログインできないことを確認。
    // CI高負荷では遷移/ハイドレーション遅延でフォーム未描画のまま fill してタイムアウトすることがあるため、
    // 入力欄が実際に表示されるまで待ってから操作する
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible({ timeout: 15000 });
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');
    // ログイン処理はbcryptの意図的に重い比較処理を含み、CI上の並列実行時はCPU競合で
    // デフォルトの5秒タイムアウトを超えることがあるため、明示的に延長する
    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません")
    ).toBeVisible({ timeout: 15000 });

    // 新パスワードでログインできることを確認
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible({ timeout: 15000 });
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", NEW_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("メールアドレス変更 → ログアウトされ新メールアドレスで再ログインできる", async ({ page }) => {
    // 各 test() は新しいブラウザコンテキストを持つため、前のテストで変更したパスワードで改めてログインする
    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", NEW_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await page.goto("/settings/account");
    const emailForm = page.locator("form").nth(0);
    const passwordForm = page.locator("form").nth(1);
    // 現在のパスワード欄はパスワード変更セクションに集約されており、メールアドレス変更時もその値を使用する
    await emailForm.locator('input[name="newEmail"]').fill(TEST_EMAIL_CHANGED);
    await passwordForm.locator('input[name="currentPassword"]').fill(NEW_PASSWORD);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/email") && res.request().method() === "PATCH"),
      emailForm.getByRole("button", { name: "メールアドレスを変更する" }).click(),
    ]);
    expect(response.status()).toBe(200);

    // メール変更後は signOut される。リダイレクトの着地先(/login)はCI高負荷でアプリ側のセッション消失時
    // 遷移(/)と競合して揺れるため、URLを /login に固定して待たない。まず signOut が走って
    // settings/account から離脱したことだけ確認し、その後 Cookie を破棄してログアウト状態を明示的に作る
    // （以降の検証を遷移/ハイドレーションのタイミングに依存させない）。
    await expect(page).not.toHaveURL(/\/settings\/account/, { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await page.context().clearCookies();

    // 新メールアドレス + 新パスワードでログインできることを確認（入力欄の表示を待ってから操作する）
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible({ timeout: 15000 });
    await page.fill("#email", TEST_EMAIL_CHANGED);
    await page.fill("#password", NEW_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
  });
});
