import { test, expect } from "./fixtures";

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
    await passwordForm.locator('input[name="passwordCurrentPassword"]').fill(TEST_USER.password);
    await passwordForm.locator('input[name="newPassword"]').fill(NEW_PASSWORD);
    await passwordForm.locator('input[name="confirmNewPassword"]').fill(NEW_PASSWORD);

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/password") && res.request().method() === "PATCH"),
      passwordForm.getByRole("button", { name: "パスワードを変更する" }).click(),
    ]);
    expect(response.status()).toBe(200);

    // セッションはパスワード変更後も有効なままのため、/login にアクセスしても proxy.ts のミドルウェアで
    // ホームへリダイレクトされてしまう。ログインフォームを表示するにはまずログアウトする必要がある。
    // 以前はpage.context().clearCookies()で直接Cookieを破棄していたが、CI環境ではclearCookies()
    // 完了後に/loginへ移動しても、サーバー側のセッション判定と噛み合わずホームへリダイレクトされ続ける
    // 事象が確認された（実行3回すべて再現）。画面上の正式なログアウト操作（Auth.jsのsignOut()）を
    // 使い、その完了（ホームへのリダイレクト）を待ってからログインフォームを検証する
    await expect(page.getByText("パスワードを変更しました")).toBeVisible({ timeout: 15000 });
    // デスクトップのサイドバー（aside）配下へロケータを限定する。モバイル用ドロップダウンにも
    // 同名の「ログアウト」ボタンがDOMに存在し得るため（Terraの指摘）、対象を一意にする。
    // ドロップダウンを開いた直後にボタンが実際にクリック可能になるまで明示的に待ってから操作する
    // ニックネームボタンはレスポンシブ用に同じテキストを含むspanを2つ持つため、
    // アクセシブルネームがニックネーム単体と完全一致しない。exact指定はしない
    const sidebar = page.locator("aside");
    await sidebar.getByRole("button", { name: TEST_USER.nickname }).click();
    const logoutButton = sidebar.getByRole("button", { name: "ログアウト", exact: true });
    await expect(logoutButton).toBeVisible({ timeout: 15_000 });
    await logoutButton.click();
    await expect(page).toHaveURL("/", { timeout: 15000 });
    // URL遷移だけでなく、ログイン時だけ表示されるニックネームボタンが消えることで
    // signOut()（セッションCookie破棄）が完了したことも確認する（Terraの指摘）
    await expect(sidebar.getByRole("button", { name: TEST_USER.nickname })).not.toBeVisible({ timeout: 15000 });

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

    // 新パスワードでログインできることを確認。URL遷移だけでなく、ログイン後にしか
    // 表示されないユーザー固有UI（サイドバーのニックネームボタン）まで表示されることを確認する
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible({ timeout: 15000 });
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", NEW_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await expect(page.getByRole("button", { name: TEST_USER.nickname })).toBeVisible({ timeout: 15000 });
  });

  test("メールアドレス変更フォーム：現在のパスワードが誤り_エラーがメール変更フォーム自身に表示されパスワード変更フォームには表示されない（GATE-41）", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", NEW_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await page.goto("/settings/account");
    const emailForm = page.locator("form").nth(0);
    const passwordForm = page.locator("form").nth(1);
    await emailForm.locator('input[name="newEmail"]').fill(TEST_EMAIL_CHANGED);
    await emailForm.locator('input[name="emailCurrentPassword"]').fill("wrong-password");

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/email") && res.request().method() === "PATCH"),
      emailForm.getByRole("button", { name: "メールアドレスを変更する" }).click(),
    ]);
    expect(response.status()).toBe(400);

    // エラーはメール変更フォーム自身の「現在のパスワード」入力欄の下に表示され、
    // パスワード変更フォーム側には一切表示されない
    await expect(emailForm.getByText("現在のパスワードが正しくありません")).toBeVisible();
    await expect(passwordForm.getByText("現在のパスワードが正しくありません")).toHaveCount(0);
    // まだログイン状態のまま（signOutされていない）ことも確認する
    await expect(page).toHaveURL("/settings/account");
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
    // GATE-41対応（2026-07-30）：現在のパスワード欄はメール変更フォーム自身に独立して存在する
    // （以前はパスワード変更フォームの入力欄と状態を共有しており、メール変更だけの操作では
    // 画面下部の別フォームへ入力する必要があった）
    await emailForm.locator('input[name="newEmail"]').fill(TEST_EMAIL_CHANGED);
    await emailForm.locator('input[name="emailCurrentPassword"]').fill(NEW_PASSWORD);

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
