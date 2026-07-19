import { test, expect } from "@playwright/test";

const TEST_EMAIL = `test_playwright@example.com`;
const TEST_USER = {
  nickname: "テストユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

// 「新規登録」テストで作成したアカウントを「ログイン」テストが使い回すため、
// 同一ワーカーでの順次実行を保証する（posts.spec.ts等と同じ理由、2026-07-19対応）
test.describe.serial("認証フロー", () => {
  test.beforeAll(async ({ request }) => {
    // 既存ユーザーがいれば削除してからテスト用ユーザーを作成
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
  });

  test("新規登録 → ホーム画面遷移", async ({ page }) => {
    await page.goto("/signup");

    await page.fill("#nickname", TEST_USER.nickname);
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.fill("#confirmPassword", TEST_USER.password);
    await page.click('button[type="submit"]');

    // `/dashboard` は認証済みなら `/`（ホーム）へリダイレクトするだけのスタブ（実装計画書 Phase 1-E/2-A 参照）
    await expect(page).toHaveURL("/", { timeout: 15000 });
    // 認証後レイアウトの確定を待つ。並列フルスイート実行時はCPU負荷でCSSの初回ペイントが
    // 一瞬遅れ、モバイル用・デスクトップ用の2つのユーザーメニューボタン（表示切り替えのみで
    // 両方DOMに存在）が同時に visible 判定になり、:visible 絞り込みでも2要素マッチ→strict違反で
    // 落ちることがある（テスト設計書10節・account-settings.spec.ts と同種の既知の不安定要因）。
    // レイアウト確定を待ったうえで、可視の先頭要素に絞って strict 違反を回避する。
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: /テストユーザー/ }).and(page.locator(":visible")).first()
    ).toBeVisible();
  });

  test("ログイン → ホーム画面遷移", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/", { timeout: 15000 });
  });

  test("誤パスワード → エラーメッセージ表示", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません")
    ).toBeVisible();
  });

  test("未認証で /dashboard → /login にリダイレクト", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
