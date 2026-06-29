import { test, expect } from "@playwright/test";

const TEST_USER = {
  nickname: "テストユーザー",
  email: `test_${Date.now()}@example.com`,
  password: "Password1234",
};

test.describe("認証フロー", () => {
  test("新規登録 → ダッシュボード遷移", async ({ page }) => {
    await page.goto("/signup");

    await page.fill("#nickname", TEST_USER.nickname);
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.fill("#confirmPassword", TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText(TEST_USER.nickname)).toBeVisible();
  });

  test("ログイン → ダッシュボード遷移", async ({ page }) => {
    await page.goto("/login");

    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");
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
