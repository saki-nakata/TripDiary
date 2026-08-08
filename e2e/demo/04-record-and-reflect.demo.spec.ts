import { test, expect } from "@playwright/test";
import { installPseudoCursor } from "./support/cursor";
import { assertDemoWriteAllowed } from "./support/guard";
import { openUserMenu, closeUserMenu, logout } from "./support/demoAuth";
import { DEMO_PLAN_TITLE, DEMO_POST } from "./support/content";

test.setTimeout(200_000);

async function waitForLeafletTiles(page: import("@playwright/test").Page) {
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".leaflet-tile:not(.leaflet-tile-loaded)")).toHaveCount(0, { timeout: 15_000 });
}

// storageState済み。マイページの6タブ（サイドバー自体がタブ切り替えを兼ねる）→プラン作成
// →プラン詳細の地図（02で作成した投稿のスポットを使うため座標がある）→レポート（統計カード・
// 各種グラフ）→年フィルタ→テーマ切替（レポート画面でダークに→訪問済み地図へ移動しダーク対応を
// 確認→ライトに戻す）→ログアウト。
test("記録と振り返り（プラン・レポート・地図・テーマ）", async ({ page }) => {
  assertDemoWriteAllowed();
  await installPseudoCursor(page);

  await page.goto("/");
  await page.waitForTimeout(800);

  const plansLink = page.locator("aside").getByRole("link", { name: "旅行プラン" });
  await plansLink.hover();
  await plansLink.click();
  await expect(page).toHaveURL(/\/mypage\?tab=plans/);
  // サイドバー自体が6タブ（旅行プラン・自分の投稿・旅行レポート・行きたい・訪問済み・
  // フォロー中の投稿）のナビゲーションを兼ねる。ここで少し静止して機能量を見せる
  await page.waitForTimeout(2000);

  const newPlanLink = page.getByRole("link", { name: "＋ 新しいプラン" });
  await newPlanLink.hover();
  await newPlanLink.click();
  await page.waitForTimeout(800);

  const titleInput = page.locator('input[name="title"]');
  await titleInput.hover();
  await titleInput.fill(DEMO_PLAN_TITLE);
  await page.waitForTimeout(500);

  // スポットとして02で新規作成した投稿を検索して追加（座標があるためプラン詳細で地図が映る）
  const spotSearchInput = page.locator('input[placeholder="スポット名・キーワードで検索"]');
  await spotSearchInput.hover();
  await spotSearchInput.fill(DEMO_POST.title);
  // 02を撮り直した場合、同じタイトルの投稿が複数存在し得る（投稿作成はトグルではなく毎回新規
  // 作成のため）。検索結果はcreatedAt降順（post.repository.tsの一貫した並び順）のため、
  // .first()で常に最新（＝最後に成功したテイク）の投稿を選ぶ
  const spotResultButton = page.getByRole("button", { name: new RegExp(DEMO_POST.title) }).first();
  await expect(spotResultButton).toBeVisible({ timeout: 10_000 });
  await spotResultButton.hover();
  await spotResultButton.click();
  await page.waitForTimeout(800);

  const createButton = page.getByRole("button", { name: "作成する" });
  await createButton.hover();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/plans") && res.request().method() === "POST"),
    createButton.click(),
  ]);
  const createdPlan = await response.json();

  await expect(page).toHaveURL(`/plans/${createdPlan.id}`, { timeout: 15_000 });
  await waitForLeafletTiles(page);
  await page.waitForTimeout(1500);

  const reportLink = page.locator("aside").getByRole("link", { name: "旅行レポート" });
  await reportLink.hover();
  await reportLink.click();
  await expect(page).toHaveURL(/\/mypage\?tab=report/);
  await page.waitForTimeout(1500);

  // レポートの中身（ReportSummary.tsx）を見せる。まず全期間（既定）でまとめカード一覧を表示し、
  // 「訪問エリア数」カードをクリックしてエリア別バブルチャートへスクロールする動きを見せる
  // （StatCardのonClickがscrollToIdで各セクションへスムーズスクロールする作り）
  const areaStatCard = page.getByRole("button", { name: /訪問エリア数/ });
  await areaStatCard.hover();
  await areaStatCard.click();
  await page.waitForTimeout(1800);

  // 高評価スポットTOP3・カテゴリ別バーグラフ・月別ヒートマップ・年別推移（全期間のみ）を
  // 順にスクロールして見せる
  await page.locator("#top-rated").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await page.locator("#category-breakdown").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await page.locator("#activity-heatmap").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const postTrend = page.locator("#post-trend");
  if (await postTrend.isVisible().catch(() => false)) {
    await postTrend.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
  }

  // 年フィルタで特定年へ絞り込み、レポートが差し替わる様子を見せる
  // （YearFilterBarはモバイル用/デスクトップ用の2つが同時にDOMへレンダリングされるため:visibleで絞る）
  const yearSelect = page.locator("select:visible");
  await yearSelect.scrollIntoViewIfNeeded();
  await yearSelect.hover();
  await yearSelect.selectOption({ index: 1 });
  await page.waitForTimeout(1800);

  // テーマ切替: 旅行レポート画面でダークにする（グラフ・カードの配色が変わるのが一番映える）。
  // その後、まだ見せていない訪問済みタブへ移動し、アプリ全体がダーク対応であることを示す
  await openUserMenu(page);
  await page.waitForTimeout(1000);
  const darkRadio = page.getByRole("radio", { name: "表示テーマ: ダーク" });
  await darkRadio.hover();
  await darkRadio.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForTimeout(1800);
  // ThemeToggleのクリックはドロップダウンを閉じないため、次のナビゲーション前に明示的に閉じる
  // （開いたままだとオーバーレイがサイドバーの他リンクへのpointer eventsを奪う）
  await closeUserMenu(page);

  const visitedLink = page.locator("aside").getByRole("link", { name: "訪問済み" });
  await visitedLink.hover();
  await visitedLink.click();
  await expect(page).toHaveURL(/\/mypage\?tab=visited/);
  // 訪問済みタブの都道府県塗り分け地図はLeafletではなく純粋なinline SVG（PrefectureMapView.tsx、
  // g.prefecture[data-code]）。外部タイル読み込みが無いため、waitForLeafletTilesは使わない
  await expect(page.locator("svg").first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(2000);

  // ライトへ戻す。ThemeProvider.select()は400msデバウンス後にPATCH /api/me/themeを実行し、
  // Sidebar.handleSignOutはログアウト直前にDBの最新テーマをCookieへミラーする実装のため、
  // PATCH完了前にログアウトすると古いダーク設定がCookieへ残る競合があり得る。
  // waitForResponseで200完了を待ち、data-theme属性の反映も確認してからログアウトする。
  await openUserMenu(page);
  const lightRadio = page.getByRole("radio", { name: "表示テーマ: ライト" });
  await lightRadio.hover();
  const [themeResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/me/theme") && res.request().method() === "PATCH"),
    lightRadio.click(),
  ]);
  expect(themeResponse.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.waitForTimeout(1500);

  await logout(page);
  await page.waitForTimeout(1500);
});
