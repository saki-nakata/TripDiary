import { test, expect } from "@playwright/test";
import { installPseudoCursor } from "./support/cursor";
import { assertDemoWriteAllowed } from "./support/guard";
import { DEMO_COMMENT_BODY } from "./support/content";

// storageState済み（demo-loginプロジェクトが01より前に実行し、ログイン状態を引き継ぐ）。
// ログイン画面は映らない。対象はいいね・行きたい・コメントいずれも自分以外の投稿（一般
// ユーザーの投稿）に限定する（toggleLikeService/toggleWishlistServiceは自己投稿への操作を
// ForbiddenErrorで拒否するため）。
test("閲覧・いいね・行きたい・コメント", async ({ page }) => {
  const { targetPostId } = assertDemoWriteAllowed();
  await installPseudoCursor(page);

  await page.goto("/");
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1500);

  await page.goto(`/posts/${targetPostId}`);
  await page.waitForTimeout(1500);

  // 画像ライトボックス（対象投稿は画像2枚を想定）
  const mainImage = page.locator("img.cursor-pointer").first();
  await mainImage.hover();
  await mainImage.click();
  const lightboxNext = page.getByRole("button", { name: "次の画像" });
  if (await lightboxNext.isVisible().catch(() => false)) {
    await lightboxNext.hover();
    await lightboxNext.click();
    await page.waitForTimeout(1500);
  }
  const lightboxClose = page.getByRole("button", { name: "閉じる" });
  await lightboxClose.hover();
  await lightboxClose.click();
  await page.waitForTimeout(500);

  // いいね
  const likeButton = page.getByTestId("like-button");
  await likeButton.hover();
  await likeButton.click();
  await page.waitForTimeout(1000);

  // 行きたい
  const wishlistButton = page.getByTitle("行きたいに追加");
  await wishlistButton.hover();
  await wishlistButton.click();
  await page.waitForTimeout(1000);

  // コメント
  const commentTextarea = page.getByTestId("comment-textarea");
  await commentTextarea.scrollIntoViewIfNeeded();
  await commentTextarea.hover();
  await commentTextarea.click();
  await commentTextarea.fill(DEMO_COMMENT_BODY);

  const commentSubmit = page.getByTestId("comment-submit");
  await commentSubmit.hover();
  await commentSubmit.click();

  await expect(page.getByTestId("comment-item").filter({ hasText: DEMO_COMMENT_BODY })).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(2000);
});
