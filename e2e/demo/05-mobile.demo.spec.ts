import { test, expect } from "@playwright/test";
import { installPseudoCursor } from "./support/cursor";
import { assertDemoWriteAllowed } from "./support/guard";
import { DEMO_NICKNAME } from "./support/constants";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[demo] ${name}が設定されていません。`);
  return value;
}

// demo-mobileプロジェクト専用。前半（未ログイン）はGuestMobileNav.tsx（未ログイン専用の
// 独立実装）を撮影するため書き込み・ログイン不要。後半は下部ナビの「ログイン」リンクから
// 実際のログインフォームでログインする（storageStateのcookie注入ではなく、あえて実フォーム
// 経由にすることで、ログイン成功時だけ発火するsessionStorageの"justLoggedIn"フラグ
// （login/page.tsx:37）を成立させ、直後のトースト案内「下のアイコンを長押しすると名前が
// 表示されます」とボトムナビのバウンド演出（Sidebar.tsx:112-124）も撮影する）。
// その後、認証後のモバイル下部ナビ（Sidebar.tsx）にある「長押しでラベル表示」インタラクション
// （touchstart 450ms保持でラベルpopupが出る、Sidebar.tsx:133-142）を「新規投稿」アイコンで見せ、
// 最後にモバイル用アバターメニュー内のThemeToggleでライト→ダークへ切り替える。
// ログイン自体もテーマ切替もDBへの書き込みを伴うため、00〜04と同じくassertDemoWriteAllowed()を呼ぶ。
test("レスポンシブ（モバイル・未ログイン→ログイン後の長押し→ダーク切替）", async ({ page }) => {
  assertDemoWriteAllowed();
  await installPseudoCursor(page);

  await page.goto("/");
  await page.waitForTimeout(1500);
  // モバイルWebKitはmouse.wheel()をサポートしないため、window.scrollByで代替する
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.waitForTimeout(1800);

  // 未ログイン下部ナビ（GuestMobileNav.tsx）の「ログイン」リンクから実際のログインフォームへ
  const loginLink = page.locator('nav a[href="/login"]:visible');
  await loginLink.hover();
  await loginLink.click();
  await expect(page).toHaveURL(/\/login/);
  await page.waitForTimeout(800);

  await page.locator("#email").hover();
  await page.fill("#email", requiredEnv("DEMO_USER_EMAIL"));
  await page.locator("#password").hover();
  await page.fill("#password", requiredEnv("DEMO_USER_PASSWORD"));
  const submitButton = page.locator('button[type="submit"]');
  await submitButton.hover();
  await submitButton.click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  // ログイン直後のトースト「下のアイコンを長押しすると名前が表示されます」
  // （showToastの表示時間2500ms、Sidebar.tsx:123）を見せてから次の操作に進む
  await page.waitForTimeout(2500);

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

  // ライト→ダーク切替。モバイル上部バーのアバターボタン（Sidebar.tsx、モバイル専用ドロップダウン）
  // を開き、中のThemeToggle（showLabels compact）でダークを選ぶ。00-auth.setup.tsのensureLightTheme()
  // により、このテストは常にライトから始まる
  const avatarButton = page.getByRole("button", { name: `${DEMO_NICKNAME}のメニュー` });
  await avatarButton.hover();
  await avatarButton.click();

  const darkRadio = page.getByRole("radio", { name: "表示テーマ: ダーク" });
  await expect(darkRadio).toBeVisible({ timeout: 10_000 });
  await darkRadio.hover();
  const [themeResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/me/theme") && res.request().method() === "PATCH"),
    darkRadio.click(),
  ]);
  expect(themeResponse.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForTimeout(2000);
});
