import { test, expect } from "@playwright/test";
import { installPseudoCursor } from "./support/cursor";
import { assertDemoWriteAllowed } from "./support/guard";

// storageState済み。通知の既読化（IntersectionObserverでの自動既読、opacity-60に薄くなり
// サイドバーの未読バッジが減る）を見せ場として使う。検索→フォローではTabiScoreが検索結果
// カード・プロフィールの両方に追加操作なしで表示される。
test("つながる（通知・検索・フォロー・TabiScore）", async ({ page }) => {
  const { followTargetNickname } = assertDemoWriteAllowed();
  await installPseudoCursor(page);

  await page.goto("/");
  // サイドバーの通知アイコンの未読バッジをまず見せてから開く
  await page.waitForTimeout(1500);

  const notificationLink = page.locator("aside").getByRole("link", { name: "通知" });
  await notificationLink.hover();
  await notificationLink.click();
  await expect(page).toHaveURL("/notification");
  await page.waitForTimeout(800);

  // 通知が視界に入るたびに自動既読化される（NotificationList.tsxのIntersectionObserver）。
  // ゆっくりスクロールしてopacity-60への変化・サイドバーの未読バッジ減少を見せる
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1200);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1200);

  const searchLink = page.locator("aside").getByRole("link", { name: "検索" });
  await searchLink.hover();
  await searchLink.click();
  await page.waitForTimeout(800);

  // 検索の既定タブは「旅スポット」。ユーザーを探すには「ユーザー」タブへ切り替える
  const userTab = page.getByRole("button", { name: "ユーザー" });
  await userTab.hover();
  await userTab.click();
  await page.waitForTimeout(500);

  const searchInput = page.getByTestId("search-input");
  await searchInput.hover();
  await searchInput.click();
  await searchInput.fill(followTargetNickname);
  await page.waitForTimeout(1200);

  const resultLink = page.getByRole("link", { name: new RegExp(followTargetNickname) }).first();
  await expect(resultLink).toBeVisible({ timeout: 10_000 });
  await resultLink.hover();
  await resultLink.click();
  await page.waitForTimeout(1200);

  // プロフィールのTabiScore（🏅 tabiRank）は追加操作なしで表示される
  const followButton = page.locator('[data-testid="follow-button"]:visible');
  await expect(followButton).not.toContainText("フォロー中");
  await followButton.hover();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/follow") && res.request().method() === "POST"),
    followButton.click(),
  ]);
  expect(response.status()).toBe(200);
  await page.mouse.move(0, 0);
  await expect(followButton).toContainText("フォロー中", { timeout: 10_000 });
  await page.waitForTimeout(1500);
});
