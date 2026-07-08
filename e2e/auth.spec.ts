import { test, expect } from "@playwright/test";

const TEST_EMAIL = `test_playwright@example.com`;
const TEST_USER = {
  nickname: "テストユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

test.describe("認証フロー", () => {
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
    await expect(page.getByRole("button", { name: /テストユーザー/ })).toBeVisible();
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
