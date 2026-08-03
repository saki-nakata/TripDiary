import { test, expect } from "./fixtures";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST, WCAG_LARGE_TEXT_MIN_CONTRAST } from "./helpers/contrast";
import { createSolidColorPng } from "./utils/testImage";

// 地図タイル（tile.openstreetmap.org）は外部ネットワーク依存で、読み込み速度・成否が
// スクリーンショットの再現性を損なうため、常に同じ単色タイルへ差し替える。
const mockMapTile = createSolidColorPng(148, 163, 184);

// PR-7e（GATE-40、DR-02グループF: 探索・検索・タグ ＋ グループG: その他）の検証。
// 対象: SearchClient.tsx・YearFilterBar.tsx・MapView.tsx・LocationPicker.tsx・
// tags/[tag]/page.tsx。
//
// グループFの残り（explore/TopRatedSection.tsx・CategorySection.tsx・AreaSection.tsx）は
// PR-7bでのホームフィード前倒し統合時点で既にbg-surface/dark:対応済みで本PRでの変更はなく、
// dark-theme-home-feed.spec.tsで「エリアから探す」「カテゴリから探す」見出しを検証済みのため
// 本specでは対象外とする。
//
// 地図クリックによるピン設置（LocationPickerの逆ジオコーディング）は外部API
// （nominatim.openstreetmap.org）への実通信を伴い、このE2EスイートではCIのネットワーク
// 制限下での安定性が未検証のため踏み込まない。対象はTerraが指摘した「地図モーダルの
// 閉じるボタン」を含む通常表示・拡大表示の配色に限定する。

const TEST_EMAIL = "test_playwright_dark_theme_explore_search@example.com";
const TEST_USER = {
  nickname: "PR7e確認用ユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};
// スクリーンショット比較対象の画面に表示されるため、実行のたびに変わるDate.now()は
// 使わず固定文字列にする（DBの一意性制約はないため問題ない。PR-7c/7dと同じ方針）
const POST_TOKYO = {
  title: "PR7e東京スポット確認用",
  body: "検索・タグページのダークテーマ確認用に作成したテスト投稿です。",
  location: "東京都",
  category: "観光",
};
const POST_OSAKA = {
  title: "PR7e大阪スポット確認用",
  body: "検索・タグページのダークテーマ確認用に作成したテスト投稿です。",
  location: "大阪府",
  category: "グルメ",
};
// ユーザー検索は自分自身（ログイン中のviewer）をexcludeUserIdで結果から除外するため、
// 「ユーザータブ」の検証はログインユーザーとは別のアカウントを検索対象にする
const SEARCH_TARGET_EMAIL = "test_playwright_dark_theme_explore_search_target@example.com";
const SEARCH_TARGET_USER = {
  nickname: "PR7e検索対象ユーザー",
  email: SEARCH_TARGET_EMAIL,
  password: "Password1234",
};

test.describe("PR-7e: 検索・タグページのライト/ダーク比較", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(SEARCH_TARGET_EMAIL)}`);
    await request.post("/api/auth/signup", { data: SEARCH_TARGET_USER });
  });

  // スクリーンショット比較のため、各テストの前に投稿を毎回作り直すのではなく、
  // アカウントごとクリーンアップしてから作り直す（テストをまたいで投稿が積み上がると、
  // 一覧の件数・並びがテストごとに変わりスクリーンショットが再現しなくなるため）
  test.beforeEach(async ({ page, request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: TEST_USER });

    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    for (const post of [POST_TOKYO, POST_OSAKA]) {
      const res = await page.request.post("/api/posts", {
        data: { ...post, visitedAt: "2026-01-01" },
      });
      expect(res.status()).toBe(201);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`旅スポットタブの見出し・検索欄・カテゴリチップが読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/search?tab=post");

      const heading = page.getByRole("heading", { name: "検索" });
      await expect(heading).toBeVisible();
      expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const searchInput = page.getByTestId("search-input");
      await expect(searchInput).toBeVisible();
      expect(await getContrastRatio(searchInput)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // カテゴリチップ（未選択状態＝bg-white→bg-surfaceの対象）
      const categoryChip = page.getByRole("button", { name: POST_TOKYO.category, exact: false });
      await expect(categoryChip).toBeVisible();
      expect(await getContrastRatio(categoryChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const popularSortButton = page.getByRole("button", { name: "人気順", exact: true });
      await expect(popularSortButton).toBeVisible();
      expect(await getContrastRatio(popularSortButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // 投稿グリッドはサイト全体の新着順一覧（無限スクロールで件数も変動する）で、
      // 共有テストDBの蓄積状況によって内容・件数が変わり非決定的になるため、
      // グリッドより上の対象要素（見出し・検索欄・タブ・カテゴリチップ・並び替え）
      // だけを撮影範囲に絞る
      await expect(page).toHaveScreenshot(`search-post-tab-${colorScheme}.png`, {
        clip: { x: 0, y: 0, width: 1280, height: 340 },
      });
    });

    test(`エリアタブの未選択チップが読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/search?tab=area");

      const areaChip = page.getByRole("button", { name: POST_OSAKA.location, exact: true });
      await expect(areaChip).toBeVisible();
      expect(await getContrastRatio(areaChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`search-area-tab-${colorScheme}.png`, { fullPage: false });
    });

    test(`ユーザータブのカード・称号バッジが読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/search?tab=user");

      // ユーザー一覧は既定でサイト全体の全ユーザーを返し、共有テストDBに蓄積された
      // 他アカウントの有無によって表示件数・並びが変わり非決定的になる。検索対象の
      // ニックネームで絞り込み、結果を1件だけに固定してから撮影する
      const searchInput = page.getByTestId("search-input");
      await searchInput.fill(SEARCH_TARGET_USER.nickname);

      const userCard = page.getByText(SEARCH_TARGET_USER.nickname, { exact: true }).first();
      await expect(userCard).toBeVisible();
      expect(await getContrastRatio(userCard)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const scoreBadge = page.getByText(/pts$/, { exact: false }).first();
      await expect(scoreBadge).toBeVisible();
      expect(await getContrastRatio(scoreBadge)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // アバター未設定時の頭文字フォールバック（bg-zinc-200 dark:bg-zinc-700の上のtext-zinc-500の対象）
      const avatarFallback = page.locator("main div.rounded-full.overflow-hidden > div").first();
      await expect(avatarFallback).toBeVisible();
      expect(await getContrastRatio(avatarFallback)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // サイドバーの「プロフィール」導線も自分自身への/users/{id}リンクのため、
      // main配下（検索結果領域）だけに絞ってカウントする
      await expect(page.locator('main a[href^="/users/"]')).toHaveCount(1);
      await expect(page).toHaveScreenshot(`search-user-tab-${colorScheme}.png`, { fullPage: false });
    });

    test(`タグページの見出し・選択/未選択チップが読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto(`/tags/${encodeURIComponent(POST_TOKYO.location)}`);

      const heading = page.getByRole("heading", { name: POST_TOKYO.location });
      await expect(heading).toBeVisible();
      expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // 選択中チップ（bg-[#16a34a]）
      const selectedChip = page.getByRole("link", { name: POST_TOKYO.location, exact: true }).first();
      await expect(selectedChip).toBeVisible();
      expect(await getContrastRatio(selectedChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // 未選択チップ（bg-white→bg-surfaceの対象）
      const unselectedChip = page.getByRole("link", { name: POST_OSAKA.location, exact: true }).first();
      await expect(unselectedChip).toBeVisible();
      expect(await getContrastRatio(unselectedChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // 投稿グリッド・件数表示（{posts.length}件の投稿）は同一エリアの全ユーザー投稿一覧で
      // 共有テストDBの蓄積状況によって変わり続けるため撮影対象から外す。チップの並び順も
      // 投稿数依存で入れ替わり得るため、行全体ではなく各チップを個別にlocator単位で撮る
      await expect(heading).toHaveScreenshot(`tags-page-heading-${colorScheme}.png`);
      await expect(selectedChip).toHaveScreenshot(`tags-page-chip-selected-${colorScheme}.png`);
      await expect(unselectedChip).toHaveScreenshot(`tags-page-chip-unselected-${colorScheme}.png`);
    });

    test(`マイページの年セレクター（YearFilterBar）が読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/mypage?tab=myposts");

      const yearSelect = page.locator("select:visible").first();
      await expect(yearSelect).toBeVisible();
      expect(await getContrastRatio(yearSelect)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // 投稿一覧側は直前に作成した投稿が「新規投稿ハイライト演出」
      // （highlighted-new-post、本PR対象外の既存機能）の対象になり得て非決定的なため、
      // YearFilterBarコンポーネント自身の根要素（ラベル+セレクト）だけをlocator単位で撮る
      const yearFilterBar = yearSelect.locator("xpath=..");
      await expect(yearFilterBar).toHaveScreenshot(`mypage-year-filter-${colorScheme}.png`);
    });
  }
});

test.describe("PR-7e: 検索・タグページの状態別ダークテーマ対応", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: TEST_USER });
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(SEARCH_TARGET_EMAIL)}`);
    await request.post("/api/auth/signup", { data: SEARCH_TARGET_USER });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", TEST_USER.email);
    await page.fill("#password", TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    for (const post of [POST_TOKYO, POST_OSAKA]) {
      const res = await page.request.post("/api/posts", {
        data: { ...post, visitedAt: "2026-01-01" },
      });
      expect(res.status()).toBe(201);
    }

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("旅スポットタブ: カテゴリチップのhover/選択状態・並び替えボタン・人気順ランキング行がダークモードで読める", async ({ page }) => {
    await page.goto("/search?tab=post");

    // 対象ボタンには`transition-colors`が付いており、クリック/hover直後に読むと
    // トランジション途中の中間色を拾って誤って低いコントラスト値になることがある。
    // クラスの切り替わり確認に加え、Tailwindの既定トランジション時間（150ms）を
    // 上回る待機を挟んでから読む
    const categoryChip = page.getByRole("button", { name: POST_TOKYO.category, exact: false });
    await categoryChip.hover();
    await page.waitForTimeout(200);
    expect(await getContrastRatio(categoryChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    await categoryChip.click();
    await expect(categoryChip).toHaveClass(/bg-blue-600/);
    await page.waitForTimeout(200);
    expect(await getContrastRatio(categoryChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const allChip = page.getByRole("button", { name: "全て", exact: true });
    await expect(allChip).toBeVisible();
    await expect(allChip).not.toHaveClass(/bg-blue-600/);
    expect(await getContrastRatio(allChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const popularSortButton = page.getByRole("button", { name: "人気順", exact: true });
    await popularSortButton.click();

    // 人気順ランキング行（border-zinc-200・bg-zinc-100サムネイル・text-zinc-900タイトルの対象）。
    // 上位20件の並び順はCI共有DBの状態に左右されるため、自分の投稿がその中に入っているかは
    // 前提にせず、先頭のランキング行（誰の投稿でもよい）でスタイルだけを検証する。
    // サイドバー・モバイルナビの「新規投稿」リンク（href="/posts/new"）も`^/posts/`に
    // マッチしてしまい.first()が誤ってそちらを拾うため、mainへスコープする
    // （同じ問題をa[href^="/users/"]で検出・修正済みのユーザータブ検証と同種のパターン）
    const rankingRow = page.locator('main a[href^="/posts/"]').first();
    await expect(rankingRow).toBeVisible();
    expect(await getContrastRatio(rankingRow)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await rankingRow.hover();
    await page.waitForTimeout(200);
    expect(await getContrastRatio(rankingRow)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // ランキング行のメタ情報（エリア・カテゴリ・投稿者名・日付、text-zinc-500の対象）。
    // getContrastRatio(rankingRow)はLink要素自身のcolorしか見ないため、子要素の
    // メタ情報テキストは別途locatorで検証する必要がある
    const metaText = rankingRow.locator("p.hidden.sm\\:flex").first();
    await expect(metaText).toBeVisible();
    expect(await getContrastRatio(metaText)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  test("エリアタブ: チップのhover・選択後の絞り込み結果がダークモードで読める", async ({ page }) => {
    await page.goto("/search?tab=area");

    // categoryChip同様、`transition-colors`の中間色を拾わないよう遷移完了を待ってから読む
    const areaChip = page.getByRole("button", { name: POST_OSAKA.location, exact: true });
    await areaChip.hover();
    await page.waitForTimeout(200);
    expect(await getContrastRatio(areaChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    await areaChip.click();
    await expect(areaChip).toHaveClass(/bg-yellow-400/);
    await page.waitForTimeout(200);
    expect(await getContrastRatio(areaChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const locationLabel = page.getByText(`${POST_OSAKA.location}の投稿`, { exact: false });
    await expect(locationLabel).toBeVisible();
    expect(await getContrastRatio(locationLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const filteredPost = page.getByText(POST_OSAKA.title, { exact: true }).first();
    await expect(filteredPost).toBeVisible();
  });

  test("ユーザータブ: カードのhover状態がダークモードで読める", async ({ page }) => {
    await page.goto("/search?tab=user");

    const searchInput = page.getByTestId("search-input");
    await searchInput.fill(SEARCH_TARGET_USER.nickname);
    const userCard = page.getByText(SEARCH_TARGET_USER.nickname, { exact: true }).first();
    const userRow = page.locator("a", { hasText: SEARCH_TARGET_USER.nickname }).first();
    await expect(userCard).toBeVisible();
    await userRow.hover();
    await page.waitForTimeout(200);
    expect(await getContrastRatio(userCard)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  test("タグページ: 未選択チップのhover状態がダークモードで読める", async ({ page }) => {
    await page.goto(`/tags/${encodeURIComponent(POST_TOKYO.location)}`);

    const unselectedChip = page.getByRole("link", { name: POST_OSAKA.location, exact: true }).first();
    await unselectedChip.hover();
    await page.waitForTimeout(200);
    expect(await getContrastRatio(unselectedChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });
});

test.describe("PR-7e: 地図コンポーネントのダークテーマ対応", () => {
  const MAP_TEST_EMAIL = "test_playwright_dark_theme_map@example.com";
  const MAP_TEST_USER = {
    nickname: "PR7e地図確認用ユーザー",
    email: MAP_TEST_EMAIL,
    password: "Password1234",
  };

  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(MAP_TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: MAP_TEST_USER });
  });

  test.beforeEach(async ({ page }) => {
    // 実際のリクエスト先は"a.tile.openstreetmap.org"のようにサブドメインが付き、
    // "tile"の直前は"/"ではなく"."になるため、"**/tile..."ではマッチしない
    await page.route("**.tile.openstreetmap.org/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "image/png", body: mockMapTile });
    });
    // マーカーアイコン（unpkg.com CDN）も外部ネットワーク依存で、読み込みタイミング次第で
    // 破損アイコン表示のまま撮影されることがあるため、タイルと同じ単色画像に差し替える
    await page.route("**/unpkg.com/leaflet@*/dist/images/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "image/png", body: mockMapTile });
    });

    await page.goto("/login");
    await page.fill("#email", MAP_TEST_USER.email);
    await page.fill("#password", MAP_TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`投稿詳細のMapView通常表示が読める（${colorScheme}）`, async ({ page }) => {
      const res = await page.request.post("/api/posts", {
        data: {
          title: `PR7e地図確認投稿_${colorScheme}_${Date.now()}`,
          body: "MapViewのダークテーマ確認用に作成したテスト投稿です。",
          location: "東京都",
          category: "観光",
          visitedAt: "2026-01-01",
          lat: 35.681236,
          lng: 139.767125,
        },
      });
      expect(res.status()).toBe(201);
      const created = await res.json();

      await page.emulateMedia({ colorScheme });
      await page.goto(`/posts/${created.id}`);

      const expandButton = page.getByRole("button", { name: "地図拡大表示", exact: false });
      await expect(expandButton).toBeVisible();
      expect(await getContrastRatio(expandButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page.locator(".leaflet-container").first()).toBeVisible();
      await expect(expandButton).toHaveScreenshot(`map-view-normal-${colorScheme}.png`);
    });

    test(`投稿作成フォームのLocationPicker通常表示が読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/posts/new");

      const pickerHeading = page.getByText("地図（任意）", { exact: false });
      await expect(pickerHeading).toBeVisible();
      expect(await getContrastRatio(pickerHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const expandButton = page.getByRole("button", { name: "地図拡大表示", exact: false });
      await expect(expandButton).toBeVisible();
      expect(await getContrastRatio(expandButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page.locator(".leaflet-container").first()).toBeVisible();
      await expect(expandButton).toHaveScreenshot(`location-picker-normal-${colorScheme}.png`);
    });
  }

  test("投稿詳細のMapView拡大モーダル・閉じるボタンがダークモードで読める", async ({ page }) => {
    const res = await page.request.post("/api/posts", {
      data: {
        title: `PR7e地図モーダル確認投稿_${Date.now()}`,
        body: "MapViewモーダルのダークテーマ確認用に作成したテスト投稿です。",
        location: "東京都",
        category: "観光",
        visitedAt: "2026-01-01",
        lat: 35.681236,
        lng: 139.767125,
      },
    });
    expect(res.status()).toBe(201);
    const created = await res.json();

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(`/posts/${created.id}`);

    const expandButton = page.getByRole("button", { name: "地図拡大表示", exact: false });
    await expandButton.click();
    const closeButton = page.getByRole("button", { name: "閉じる", exact: true });
    await expect(closeButton).toBeVisible();
    expect(await getContrastRatio(closeButton)).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_MIN_CONTRAST);

    const modal = page.locator("div.fixed.inset-0.z-50");
    await expect(modal).toBeVisible();
    // モーダルの枠・閉じるボタンは撮影対象に含めつつ、外部地図タイル
    // （.leaflet-container、実ネットワーク経由でサブピクセル差分が残り得る）と、
    // 半透明の背景オーバーレイ（bg-black/60）越しに透けて見える背後の投稿カード
    // （タイトルにDate.now()を含み実行のたびに変わる）を視覚回帰の対象から除く
    await page.waitForTimeout(300);
    await expect(modal).toHaveScreenshot("map-view-modal-dark.png", {
      mask: [modal.locator(".leaflet-container"), page.locator('[data-testid="post-card"]')],
    });

    await closeButton.click();
    await expect(closeButton).toBeHidden();
  });

  test("投稿作成フォームのLocationPicker拡大モーダル・閉じるボタンがダークモードで読める", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/posts/new");

    const expandButton = page.getByRole("button", { name: "地図拡大表示", exact: false });
    await expandButton.click();
    const closeButton = page.getByRole("button", { name: "閉じる", exact: true });
    await expect(closeButton).toBeVisible();
    expect(await getContrastRatio(closeButton)).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_MIN_CONTRAST);

    const modal = page.locator("div.fixed.inset-0.z-50");
    await expect(modal).toBeVisible();
    await page.waitForTimeout(300);
    await expect(modal).toHaveScreenshot("location-picker-modal-dark.png");

    await closeButton.click();
    await expect(closeButton).toBeHidden();
  });
});
