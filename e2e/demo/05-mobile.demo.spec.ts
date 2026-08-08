import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { installPseudoCursor } from "./support/cursor";
import { DEMO_STORAGE_STATE_PATH } from "./support/paths";

// demo-mobileプロジェクト専用。前半（未ログイン）はGuestMobileNav.tsx（未ログイン専用の
// 独立実装）を撮影するため書き込み・ログイン不要。後半はdemo-loginが生成した
// storageStateのcookieだけをcontext.addCookies()で注入してログイン状態に切り替え、
// 認証後のモバイル下部ナビ（Sidebar.tsx）にある「長押しでラベル表示」インタラクション
// （touchstart 450ms保持でラベルpopupが出る、Sidebar.tsx:133-142）を「新規投稿」アイコンで見せる。
// フォーム送信等の書き込みは行わないため、失敗しても本番への影響は無く何度でも撮り直せる。
test("レスポンシブ（モバイル・未ログイン→ログイン後の長押し）", async ({ page, context }) => {
  await installPseudoCursor(page);

  await page.goto("/");
  await page.waitForTimeout(1500);
  // モバイルWebKitはmouse.wheel()をサポートしないため、window.scrollByで代替する
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(1500);

  // getByRole("link", { name: "検索" }) はポータル内の「エリア検索」リンクにも部分一致する。
  // また、デスクトップ用GuestSidebarNav（aside内のnav）もCSSで非表示なだけでDOM上には
  // 存在するため、下部ナビの検索リンク（href="/search"完全一致）を:visibleで一意に特定する
  const searchLink = page.locator('nav a[href="/search"]:visible');
  await searchLink.hover();
  await searchLink.click();
  await expect(page).toHaveURL(/\/search/);
  await page.waitForTimeout(1200);

  const firstPostCard = page.getByTestId("post-card").first();
  await expect(firstPostCard).toBeVisible({ timeout: 10_000 });
  await firstPostCard.hover();
  await firstPostCard.click();
  await page.waitForTimeout(2000);

  // ここからログイン状態へ切り替える。demo-loginのstorageStateからcookieだけを取り出して
  // 注入する（localStorageは引き継がない。認証はセッションcookieのみで成立するため）
  const storageState = JSON.parse(fs.readFileSync(DEMO_STORAGE_STATE_PATH, "utf-8"));
  await context.addCookies(storageState.cookies);

  await page.goto("/");
  await page.waitForTimeout(1500);

  // 認証後のモバイル下部ナビ（Sidebar.tsx、fixed bottom-0）で「新規投稿」アイコンを長押しする。
  // 中央の丸型強調ボタン（isCreate分岐）だが、長押しのラベルpopup自体は他の項目と同じ
  // pressedKey===item.keyのロジックで表示される。onTouchStartから450ms後に表示されるため、
  // touchstart/touchendを手動でdispatchし、450msを超える保持時間を挟む
  const bottomNav = page.locator('nav[class*="bottom-0"]');
  const newPostIcon = bottomNav.getByRole("link", { name: "新規投稿", exact: true });
  await expect(newPostIcon).toBeVisible({ timeout: 10_000 });

  const box = await newPostIcon.boundingBox();
  if (!box) throw new Error("新規投稿アイコンの位置を取得できませんでした");
  const point = { identifier: 0, clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };

  await newPostIcon.dispatchEvent("touchstart", { touches: [point], changedTouches: [point], targetTouches: [point] });
  // 450ms経過でラベルpopupが表示される。保持したまま少し静止して見せてから離す
  await page.waitForTimeout(1500);
  await newPostIcon.dispatchEvent("touchend", { touches: [], changedTouches: [point], targetTouches: [] });
  await page.waitForTimeout(1000);
});
