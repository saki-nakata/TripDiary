import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { DEMO_NICKNAME } from "./constants";
import { DEMO_STORAGE_STATE_PATH } from "./paths";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[demo] ${name}が設定されていません。`);
  return value;
}

// 00-auth.setup.tsだけが呼ぶ。auth.spec.ts:41-47と同じ #email/#password/送信ボタンのパターン。
// 成功後にstorageStateを保存し、01〜04がログイン画面を経由せずに開始できるようにする。
export async function loginAsDemo(page: Page): Promise<void> {
  const email = requiredEnv("DEMO_USER_EMAIL");
  const password = requiredEnv("DEMO_USER_PASSWORD");

  await page.goto("/login");
  await page.locator("#email").hover();
  await page.fill("#email", email);
  await page.locator("#password").hover();
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 15_000 });
  // account-settings.spec.tsと同じく、レイアウト確定のレース（モバイル/デスクトップ両方の
  // ユーザーメニューボタンが一瞬同時にDOM上へ現れ得る）を避けるため networkidle を待つ
  await page.waitForLoadState("networkidle");

  // テーマはDBへ永続化される（ThemeProvider.select()）。前回の撮影が04のダーク→ライトの
  // 途中で失敗していると、このアカウントはダークのまま残っている可能性がある。storageStateを
  // 保存する前に必ずライトへ揃え、01〜05すべてが常にライトから始まることを保証する
  await ensureLightTheme(page);

  await page.context().storageState({ path: DEMO_STORAGE_STATE_PATH });
}

async function ensureLightTheme(page: Page): Promise<void> {
  const isDark = (await page.locator("html").getAttribute("data-theme")) === "dark";
  if (!isDark) return;

  await openUserMenu(page);
  const lightRadio = page.getByRole("radio", { name: "表示テーマ: ライト" });
  const [themeResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/me/theme") && res.request().method() === "PATCH"),
    lightRadio.click(),
  ]);
  expect(themeResponse.status()).toBe(200);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await closeUserMenu(page);
}

// aside（デスクトップサイドバー）配下へロケータを限定する。モバイル用ドロップダウンにも
// 同名の要素がDOM上に存在し得るため（account-settings.spec.tsと同じ理由）。
// ニックネームボタンはレスポンシブ用に同じテキストを含むspanを2つ持つため exact指定はしない。
//
// ドロップダウンの開閉はトグル（Sidebar.tsxのsetDropdownOpen((o) => !o)）のため、
// 既に開いている状態で無条件にクリックすると閉じてしまう。「ログアウト」ボタンが
// 見えていなければ開く、という冪等な実装にする（04でテーマ切替→別画面遷移→再度開く、
// という一連の操作でも安全に使えるようにするため）。
export async function openUserMenu(page: Page): Promise<void> {
  const sidebar = page.locator("aside");
  const logoutButton = sidebar.getByRole("button", { name: "ログアウト", exact: true });
  if (await logoutButton.isVisible().catch(() => false)) return;

  const nicknameButton = sidebar.getByRole("button", { name: DEMO_NICKNAME });
  await nicknameButton.hover();
  await nicknameButton.click();
  await expect(logoutButton).toBeVisible({ timeout: 15_000 });
}

// ドロップダウンを開いたまま（テーマ切替直後等）サイドバーの他リンクをクリックしようとすると、
// ドロップダウンのオーバーレイがpointer eventsを奪ってタイムアウトする。ThemeToggleのクリックは
// ドロップダウンを閉じないため、テーマ切替後に他のナビゲーションへ進む前に明示的に閉じる。
export async function closeUserMenu(page: Page): Promise<void> {
  const sidebar = page.locator("aside");
  const logoutButton = sidebar.getByRole("button", { name: "ログアウト", exact: true });
  if (!(await logoutButton.isVisible().catch(() => false))) return;

  const nicknameButton = sidebar.getByRole("button", { name: DEMO_NICKNAME });
  await nicknameButton.click();
  await expect(logoutButton).not.toBeVisible({ timeout: 15_000 });
}

export async function logout(page: Page): Promise<void> {
  await openUserMenu(page);
  const sidebar = page.locator("aside");
  const logoutButton = sidebar.getByRole("button", { name: "ログアウト", exact: true });
  await expect(logoutButton).toBeVisible({ timeout: 15_000 });
  await logoutButton.hover();
  await logoutButton.click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}
