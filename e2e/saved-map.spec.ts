import { test, expect } from "@playwright/test";

const TEST_EMAIL = "test_playwright_saved_map@example.com";
const TEST_USER = {
  nickname: "行きたい訪問済みテスト",
  email: TEST_EMAIL,
  password: "Password1234",
};

const POST_TITLE = `E2E行きたいテスト投稿_${Date.now()}`;

test.describe.serial("行きたい/訪問済みの地図管理フロー（4-G）", () => {
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

  test("行きたい登録した投稿が地図＋県別グループ一覧に表示される", async ({ page }) => {
    const postRes = await page.request.post("/api/posts", {
      data: {
        title: POST_TITLE,
        body: "行きたいリストのE2Eテスト用投稿です。",
        location: "東京都",
        category: "観光",
        visitedAt: "2026-01-01",
      },
    });
    expect(postRes.status()).toBe(201);
    const postId = (await postRes.json()).id;

    const wishlistRes = await page.request.post(`/api/posts/${postId}/wishlist`);
    expect(wishlistRes.status()).toBe(200);

    await page.goto("/mypage?tab=wishlist");

    await expect(page.getByText(POST_TITLE)).toBeVisible();
    await expect(page.getByText("東京都（1件）")).toBeVisible();
  });

  test("「外す」ボタン → 確認ダイアログ → カードと件数見出しが消え、リロード後も解除が反映される", async ({ page }) => {
    await page.goto("/mypage?tab=wishlist");
    await expect(page.getByText(POST_TITLE)).toBeVisible();

    const card = page.getByText(POST_TITLE).locator("xpath=ancestor::div[contains(@class, 'group/saved')]");
    await card.getByRole("button", { name: "行きたいから外す" }).click();

    await page.getByRole("button", { name: "外す", exact: true }).click();

    // 楽観的UI: カードと県グループの件数見出しが即座に消える
    await expect(page.getByText(POST_TITLE)).not.toBeVisible();
    await expect(page.getByText("東京都（1件）")).not.toBeVisible();
    await expect(page.getByText("「行きたい」から外しました")).toBeVisible();

    // サーバー側にも解除が反映されていることをリロードで確認
    await page.reload();
    await expect(page.getByText(POST_TITLE)).not.toBeVisible();
    await expect(page.getByText("行きたいリストがまだありません")).toBeVisible();
  });
});
