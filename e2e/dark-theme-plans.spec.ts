import { test, expect } from "./fixtures";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST } from "./helpers/contrast";

// PR-7d（GATE-40、DR-02グループE: 旅行プラン）の検証。
// 対象: plans/new・plans/[id]・plans/[id]/edit・SpotPicker.tsx・ReportSummary.tsx・
// PlanForm.tsx・PlanActions.tsx・PlanLoadMoreList.tsx・CompletedPlansAccordion.tsx。
//
// スクリーンショット比較（toHaveScreenshot）に使うテキストは実行のたびに変わらない
// 固定文字列を使う（DB上の一意性が必要なタイトルにはDate.now()を使うが、その画面は
// スクリーンショット比較対象にしない、PR-7cと同じ方針）。

const TEST_EMAIL = "test_playwright_dark_theme_plans@example.com";
const TEST_USER = {
  nickname: "PR7d確認用ユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};
const STATIC_PLAN_TITLE = "ダークモード確認用プラン";
const WISHLIST_POST_TITLE = `PR7d行きたいスポット_${Date.now()}`;
const REPORT_POST_TITLE = `PR7dレポート確認用投稿_${Date.now()}`;
const FREE_SPOT_TITLE = "新規追加スポット";
const PLAN_MEMO = "ダークテーマ確認用のメモです。";

test.describe("PR-7d: 旅行プランのダークテーマ対応", () => {
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

  for (const colorScheme of ["light", "dark"] as const) {
    test(`プラン作成フォームが読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/plans/new");

      const titleLabel = page.getByText("タイトル", { exact: false }).first();
      await expect(titleLabel).toBeVisible();
      expect(await getContrastRatio(titleLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // DB保存しない（送信しない）ため、一意性のためのDate.now()は使わず固定文字列で入力する
      await page.fill('input[name="title"]', STATIC_PLAN_TITLE);

      const addBudgetButton = page.getByRole("button", { name: "＋ 項目を追加" });
      await expect(addBudgetButton).toBeVisible();
      expect(await getContrastRatio(addBudgetButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const memoLabel = page.getByText("メモ", { exact: true });
      await expect(memoLabel).toBeVisible();
      expect(await getContrastRatio(memoLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const submitButton = page.getByRole("button", { name: "作成する" });
      await expect(submitButton).toBeVisible();
      expect(await getContrastRatio(submitButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const cancelButton = page.getByRole("button", { name: "キャンセル" });
      await expect(cancelButton).toBeVisible();
      expect(await getContrastRatio(cancelButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`plan-form-new-${colorScheme}.png`, { fullPage: false });
    });
  }

  test("SpotPickerの検索・行きたいリスト候補・新規スポット追加欄がダークモードで読める", async ({ page }) => {
    // 行きたいリスト候補（SpotListItem）を描画させるため、投稿を作成して行きたいに追加しておく
    const postRes = await page.request.post("/api/posts", {
      data: {
        title: WISHLIST_POST_TITLE,
        body: "行きたいリスト候補確認用の投稿です。",
        location: "東京都",
        category: "観光",
        visitedAt: "2026-01-01",
      },
    });
    expect(postRes.status()).toBe(201);
    const wishlistPost = await postRes.json();
    await page.request.post(`/api/posts/${wishlistPost.id}/wishlist`);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/plans/new");

    // キーワード検索欄
    const searchInput = page.getByPlaceholder("スポット名・キーワードで検索");
    await expect(searchInput).toBeVisible();
    expect(await getContrastRatio(searchInput)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 行きたいリスト候補（SpotListItem）
    const wishlistLabel = page.getByText("行きたいリスト（", { exact: false });
    await expect(wishlistLabel).toBeVisible();
    expect(await getContrastRatio(wishlistLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const wishlistItemTitle = page.getByText(WISHLIST_POST_TITLE, { exact: true });
    await expect(wishlistItemTitle).toBeVisible();
    expect(await getContrastRatio(wishlistItemTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    await wishlistItemTitle.click();

    // 選択済みスポット（SortableSelectedItem）
    const selectedLabel = page.getByText("選択済みスポット", { exact: false });
    await expect(selectedLabel).toBeVisible();
    expect(await getContrastRatio(selectedLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    const selectedItemTitle = page.locator("li").filter({ hasText: WISHLIST_POST_TITLE }).first();
    await expect(selectedItemTitle).toBeVisible();
    expect(await getContrastRatio(selectedItemTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 新規スポット追加欄（自由入力）
    const freeTitleInput = page.getByPlaceholder("例：〇〇公園");
    await expect(freeTitleInput).toBeVisible();
    expect(await getContrastRatio(freeTitleInput)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await freeTitleInput.fill(FREE_SPOT_TITLE);
    await page.locator("select").filter({ hasText: "エリア" }).first();
    // ラベルに紐づくselectを直接指定できないため、新規追加欄内の1つ目のselectをエリアとして操作する
    const areaSelect = page.locator("select").nth(0);
    await areaSelect.selectOption("東京都");

    const addFreeSpotButton = page.getByRole("button", { name: "追加", exact: true });
    await expect(addFreeSpotButton).toBeVisible();
    expect(await getContrastRatio(addFreeSpotButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await addFreeSpotButton.click();

    const freeSpotItem = page.locator("li").filter({ hasText: FREE_SPOT_TITLE }).first();
    await expect(freeSpotItem).toBeVisible();
    expect(await getContrastRatio(freeSpotItem)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  test("プラン詳細（メモ・予算内訳・スポット一覧・旅を記録リンク）・編集画面・削除確認ダイアログがダークモードで読める", async ({ page }) => {
    await page.goto("/plans/new");
    await page.fill('input[name="title"]', `PR7dプラン詳細確認用_${Date.now()}`);

    // 予算内訳
    await page.getByRole("button", { name: "＋ 項目を追加" }).click();
    await page.locator('input[placeholder="金額"]').fill("3000");
    await page.locator('input[placeholder="内容（例：交通費）"]').fill("交通費");

    await page.fill('textarea[placeholder="旅の目的やメモ"]', PLAN_MEMO);

    // スポット（自由入力で1件追加）
    await page.getByPlaceholder("例：〇〇公園").fill(FREE_SPOT_TITLE);
    await page.locator("select").nth(0).selectOption("東京都");
    await page.getByRole("button", { name: "追加", exact: true }).click();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/plans") && res.request().method() === "POST"),
      page.getByRole("button", { name: "作成する" }).click(),
    ]);
    expect(response.status()).toBe(201);
    const created = await response.json();

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/plans/${created.id}`);

    const memoText = page.getByText(PLAN_MEMO, { exact: true });
    await expect(memoText).toBeVisible();
    expect(await getContrastRatio(memoText)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const budgetTotal = page.getByText("¥3,000", { exact: true });
    await expect(budgetTotal).toBeVisible();
    expect(await getContrastRatio(budgetTotal)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const budgetChip = page.getByText("交通費 3,000円", { exact: true });
    await expect(budgetChip).toBeVisible();
    expect(await getContrastRatio(budgetChip)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const spotTitle = page.getByText(FREE_SPOT_TITLE, { exact: true }).first();
    await expect(spotTitle).toBeVisible();
    expect(await getContrastRatio(spotTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const recordLink = page.getByRole("link", { name: /旅を記録/ }).first();
    await expect(recordLink).toBeVisible();
    expect(await getContrastRatio(recordLink)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 編集画面
    await page.goto(`/plans/${created.id}/edit`);
    const editHeading = page.getByRole("heading", { name: "旅行プランを編集する" });
    await expect(editHeading).toBeVisible();
    expect(await getContrastRatio(editHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 完了ステータス切り替え（編集時のみ表示）
    const completedButton = page.getByRole("button", { name: "完了済み", exact: true });
    await expect(completedButton).toBeVisible();
    expect(await getContrastRatio(completedButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 削除確認ダイアログ
    await page.goto(`/plans/${created.id}`);
    await page.getByRole("button", { name: "削除", exact: true }).click();
    const dialogTitle = page.getByText("プランを削除しますか？");
    await expect(dialogTitle).toBeVisible();
    expect(await getContrastRatio(dialogTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    const dialogCancel = page.getByRole("button", { name: "キャンセル" });
    expect(await getContrastRatio(dialogCancel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await dialogCancel.click();
  });

  test("マイページの旅行プランタブ（一覧カード・完了済みアコーディオン）がダークモードで読める", async ({ page }) => {
    await page.goto("/plans/new");
    await page.fill('input[name="title"]', `PR7d進行中プラン_${Date.now()}`);
    const [activeRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/plans") && res.request().method() === "POST"),
      page.getByRole("button", { name: "作成する" }).click(),
    ]);
    expect(activeRes.status()).toBe(201);

    const completedTitle = `PR7d完了済みプラン_${Date.now()}`;
    await page.goto("/plans/new");
    await page.fill('input[name="title"]', completedTitle);
    const [completedRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/plans") && res.request().method() === "POST"),
      page.getByRole("button", { name: "作成する" }).click(),
    ]);
    expect(completedRes.status()).toBe(201);
    const completedPlan = await completedRes.json();
    await page.request.patch(`/api/plans/${completedPlan.id}/complete`, {
      data: { completed: true, version: completedPlan.version },
    });

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/mypage?tab=plans");

    // 進行中プラン一覧（PlanLoadMoreList）
    const newPlanLink = page.getByRole("link", { name: "＋ 新しいプラン" });
    await expect(newPlanLink).toBeVisible();
    expect(await getContrastRatio(newPlanLink)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const activeCard = page.getByText(/PR7d進行中プラン_/).first();
    await expect(activeCard).toBeVisible();
    expect(await getContrastRatio(activeCard)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 完了済みアコーディオン（CompletedPlansAccordion、閉状態のsummary）
    const accordionSummary = page.getByText("✅ 完了済みの旅行プラン", { exact: false });
    await expect(accordionSummary).toBeVisible();
    expect(await getContrastRatio(accordionSummary)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await accordionSummary.click();

    const completedCard = page.getByText(completedTitle, { exact: true });
    await expect(completedCard).toBeVisible();
    expect(await getContrastRatio(completedCard)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  test("マイページの旅行レポートタブ（まとめカード・エリア別・カテゴリ別・月別ヒートマップ）がダークモードで読める", async ({ page }) => {
    const postRes = await page.request.post("/api/posts", {
      data: {
        title: REPORT_POST_TITLE,
        body: "旅行レポート確認用の投稿です。",
        location: "大阪府",
        category: "グルメ",
        visitedAt: "2026-02-10",
        rating: 5,
      },
    });
    expect(postRes.status()).toBe(201);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/mypage?tab=report");

    const summaryHeading = page.getByText("の旅まとめ", { exact: false });
    await expect(summaryHeading).toBeVisible();
    expect(await getContrastRatio(summaryHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const areaHeading = page.locator("#area-breakdown").getByText("のエリア別投稿数", { exact: false });
    await expect(areaHeading).toBeVisible();
    expect(await getContrastRatio(areaHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const areaBubble = page.locator("#area-breakdown").getByText("大阪府", { exact: true });
    await expect(areaBubble).toBeVisible();

    const categoryHeading = page.locator("#category-breakdown").getByText("のカテゴリ別投稿数", { exact: false });
    await expect(categoryHeading).toBeVisible();
    expect(await getContrastRatio(categoryHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const categoryLabel = page.locator("#category-breakdown").getByText("グルメ", { exact: true });
    await expect(categoryLabel).toBeVisible();
    expect(await getContrastRatio(categoryLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const heatmapHeading = page.locator("#activity-heatmap");
    await expect(heatmapHeading).toBeVisible();
    const heatmapLabel = heatmapHeading.getByText("少ない", { exact: true });
    await expect(heatmapLabel).toBeVisible();
    expect(await getContrastRatio(heatmapLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const topRatedHeading = page.locator("#top-rated").getByText("の高評価スポットTOP3", { exact: false });
    await expect(topRatedHeading).toBeVisible();
    const topRatedTitle = page.locator("#top-rated").getByText(REPORT_POST_TITLE, { exact: true });
    await expect(topRatedTitle).toBeVisible();
    expect(await getContrastRatio(topRatedTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });
});

// Terraレビュー（2026-08-01）の指摘1点目: 新規E2Eが1280×900のみでsm/md/xl分岐を
// 検証していなかったため、SpotPicker・PlanForm・PlanActions・CompletedPlansAccordionの
// レスポンシブ分岐を320/375/768pxのダークモードで追加検証する。
test.describe("PR-7d: モバイル・タブレット幅でのダークテーマ対応", () => {
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

  for (const width of [375, 768] as const) {
    test(`プラン作成フォーム・SpotPickerが${width}px幅でダークモードで読める`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/plans/new");

      const titleLabel = page.getByText("タイトル", { exact: false }).first();
      await expect(titleLabel).toBeVisible();
      expect(await getContrastRatio(titleLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // 新規スポット追加欄（自由入力、sm:flex-row で分岐する2カラムレイアウト）
      const freeSpotTitle = `${FREE_SPOT_TITLE}_${width}`;
      await page.getByPlaceholder("例：〇〇公園").fill(freeSpotTitle);
      await page.locator("select").nth(0).selectOption("東京都");
      const addFreeSpotButton = page.getByRole("button", { name: "追加", exact: true });
      expect(await getContrastRatio(addFreeSpotButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      await addFreeSpotButton.click();

      // 選択済みスポット（sm:hidden / hidden sm:flex で出し分けている＋・削除バッジ双方を、
      // 実際のビューポート幅で描画させて検証する）
      const freeSpotItem = page.locator("li").filter({ hasText: freeSpotTitle }).first();
      await expect(freeSpotItem).toBeVisible();
      expect(await getContrastRatio(freeSpotItem)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const submitButton = page.getByRole("button", { name: "作成する" });
      expect(await getContrastRatio(submitButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`plan-form-spotpicker-${width}-dark.png`, { fullPage: false });
    });
  }

  test("SpotPicker・PlanFormが320px幅でダークモードで読める（最小幅の簡易確認）", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto("/plans/new");

    const titleLabel = page.getByText("タイトル", { exact: false }).first();
    await expect(titleLabel).toBeVisible();
    expect(await getContrastRatio(titleLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const freeTitleInput = page.getByPlaceholder("例：〇〇公園");
    await expect(freeTitleInput).toBeVisible();
    expect(await getContrastRatio(freeTitleInput)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const submitButton = page.getByRole("button", { name: "作成する" });
    await expect(submitButton).toBeVisible();
    expect(await getContrastRatio(submitButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  for (const width of [375, 768] as const) {
    test(`マイページ旅行プランタブ（PlanActions・完了済みアコーディオン）が${width}px幅でダークモードで読める`, async ({ page }) => {
      // スクリーンショット比較対象のため、実行のたびに変わるDate.now()は使わず幅ごとの固定文字列にする
      // （PR-7cで判明した「動的テキストがスクリーンショット差分の原因になる」パターンを踏まないため）
      const planTitle = `PR7dモバイル確認プラン_${width}px`;
      await page.goto("/plans/new");
      await page.fill('input[name="title"]', planTitle);
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().includes("/api/plans") && r.request().method() === "POST"),
        page.getByRole("button", { name: "作成する" }).click(),
      ]);
      const created = await res.json();
      await page.request.patch(`/api/plans/${created.id}/complete`, {
        data: { completed: true, version: created.version },
      });

      await page.emulateMedia({ colorScheme: "dark" });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/mypage?tab=plans");

      const accordionSummary = page.getByText("✅ 完了済みの旅行プラン", { exact: false });
      await expect(accordionSummary).toBeVisible();
      expect(await getContrastRatio(accordionSummary)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      await accordionSummary.click();

      const planCard = page.getByText(planTitle, { exact: true }).filter({ visible: true }).first();
      await expect(planCard).toBeVisible();
      expect(await getContrastRatio(planCard)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // PlanActions（icons variant）はTwemojiIconのみでテキストノードを持たないため、
      // コントラスト計算（テキスト色対背景色）の対象にはせず表示確認とスクリーンショットに委ねる。
      // 768pxはmd:ブレークポイントに一致し、border-zinc-100 md:border-zinc-200
      // md:dark:border-zinc-700 のような複合バリアントが実際に描画されることを確認する
      const editButton = page.getByRole("button", { name: "編集" }).filter({ visible: true }).first();
      const deleteButton = page.getByRole("button", { name: "削除" }).filter({ visible: true }).first();
      await expect(editButton).toBeVisible();
      await expect(deleteButton).toBeVisible();

      await expect(page).toHaveScreenshot(`mypage-plans-actions-${width}-dark.png`, { fullPage: false });
    });
  }
});

// Terraレビュー（2026-08-01）の指摘2点目: 新規E2Eが例外レスポンス時のUI表示（エラートースト等）を
// 検証していなかったため、PlanForm・PlanActions・SpotPicker・PlanLoadMoreListの主要な失敗系を追加検証する。
// ダークテーマPRのため、エラートースト自体が暗背景で読めることまで確認する（toast.tsxの
// dark:バリアント欠落〔本PRで是正〕を検出できるよう、コントラスト検証を必ず含める）。
test.describe("PR-7d: 例外レスポンスのUI表示（ダークモード）", () => {
  const ERROR_TEST_EMAIL = "test_playwright_dark_theme_plans_errors@example.com";
  const ERROR_TEST_USER = {
    nickname: "PR7dエラー確認用ユーザー",
    email: ERROR_TEST_EMAIL,
    password: "Password1234",
  };

  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(ERROR_TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: ERROR_TEST_USER });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", ERROR_TEST_USER.email);
    await page.fill("#password", ERROR_TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("PlanForm: 作成APIの400エラー・通信失敗時にエラートーストがダークモードで読める", async ({ page }) => {
    await page.goto("/plans/new");
    await page.fill('input[name="title"]', `PR7dエラー確認_${Date.now()}`);

    // APIが422/400相当のエラーメッセージを返すケース（PlanForm.tsxのonSubmitが
    // `err.error ?? "エラーが発生しました"`をErrorに包んでcatch節でtoast表示する経路）
    await page.route("**/api/plans", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "スポットの登録に失敗しました" }),
      });
    });
    await page.getByRole("button", { name: "作成する" }).click();
    const apiErrorToast = page.getByTestId("toast").filter({ hasText: "スポットの登録に失敗しました" }).first();
    await expect(apiErrorToast).toBeVisible();
    expect(await getContrastRatio(apiErrorToast)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await expect(apiErrorToast).toBeHidden({ timeout: 10000 });

    // 通信そのものが失敗するケース（fetchが例外を投げ、同じcatch節が"エラーが発生しました"等を表示する）
    await page.unroute("**/api/plans");
    await page.route("**/api/plans", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.abort("failed");
    });
    await page.getByRole("button", { name: "作成する" }).click();
    const networkErrorToast = page.getByTestId("toast").first();
    await expect(networkErrorToast).toBeVisible();
    expect(await getContrastRatio(networkErrorToast)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  test("PlanActions: 完了切り替えの409・削除失敗時にエラートーストがダークモードで読める", async ({ page }) => {
    await page.goto("/plans/new");
    await page.fill('input[name="title"]', `PR7dアクションエラー確認_${Date.now()}`);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/plans") && r.request().method() === "POST"),
      page.getByRole("button", { name: "作成する" }).click(),
    ]);
    const created = await res.json();

    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(`/plans/${created.id}`);

    // 完了切り替えの409（バージョン競合）
    await page.route(`**/api/plans/${created.id}/complete`, async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "他の変更と競合しました" }),
      });
    });
    await page.getByTestId("plan-completed-checkbox").locator("xpath=..").click();
    const conflictToast = page.getByTestId("toast").filter({ hasText: "他の変更と競合しました" }).first();
    await expect(conflictToast).toBeVisible();
    expect(await getContrastRatio(conflictToast)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await expect(conflictToast).toBeHidden({ timeout: 10000 });

    // 削除失敗（500）
    await page.route(`**/api/plans/${created.id}`, async (route) => {
      if (route.request().method() !== "DELETE") return route.continue();
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "internal" }) });
    });
    await page.getByRole("button", { name: "削除", exact: true }).click();
    await page.getByRole("button", { name: "削除する", exact: true }).click();
    const deleteErrorToast = page.getByTestId("toast").filter({ hasText: "削除に失敗しました" }).first();
    await expect(deleteErrorToast).toBeVisible();
    expect(await getContrastRatio(deleteErrorToast)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  test("SpotPicker: スポット検索・その他のスポット取得失敗時にエラートーストがダークモードで読める", async ({ page }) => {
    await page.route("**/api/posts/explore*", async (route) => {
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "internal" }) });
    });
    await page.goto("/plans/new");

    await page.getByPlaceholder("スポット名・キーワードで検索").fill("検索失敗テスト");
    const searchErrorToast = page.getByTestId("toast").filter({ hasText: "検索に失敗しました" }).first();
    await expect(searchErrorToast).toBeVisible();
    expect(await getContrastRatio(searchErrorToast)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await expect(searchErrorToast).toBeHidden({ timeout: 10000 });

    await page.getByText("その他のスポット", { exact: false }).click();
    const loadErrorToast = page.getByTestId("toast").filter({ hasText: "スポットの読み込みに失敗しました" }).first();
    await expect(loadErrorToast).toBeVisible();
    expect(await getContrastRatio(loadErrorToast)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });

  test("PlanLoadMoreList: 継続取得の失敗時に既存一覧を保持したままエラートーストがダークモードで読める", async ({ page }) => {
    // ページサイズ（20件、/api/mypage/plans/active route.ts）を超えて hasMore=true にするため21件作成する
    const createResponses = await Promise.all(
      Array.from({ length: 21 }, (_, i) =>
        page.request.post("/api/plans", { data: { title: `PR7d継続確認プラン_${i}_${Date.now()}` } })
      )
    );
    for (const res of createResponses) {
      expect(res.status(), await res.text()).toBe(201);
    }

    await page.goto("/mypage?tab=plans");
    // PlanListItem見出しは`<TwemojiIcon/> {plan.title}`のためテキストノードの先頭に空白が入る。
    // ^アンカーだと不一致になるため、アンカーなしの部分一致にする
    const planCards = page.getByText(/PR7d継続確認プラン_/);
    await expect(planCards.first()).toBeVisible();
    const initialCount = await planCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // "?"はPlaywrightのglobパターンでは任意の1文字にマッチしてしまうため、
    // クエリ文字列の判定にはグロブ文字列ではなくURL述語関数を使う
    await page.route(
      (url) => url.pathname === "/api/mypage/plans/active" && url.searchParams.has("cursor"),
      async (route) => {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "internal" }) });
      }
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const loadMoreErrorToast = page.getByTestId("toast").filter({ hasText: "読み込みに失敗しました" }).first();
    await expect(loadMoreErrorToast).toBeVisible();
    expect(await getContrastRatio(loadMoreErrorToast)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 失敗しても既存一覧（1ページ目の20件）は保持されたまま消えないことを確認する
    const remainingCount = await planCards.count();
    expect(remainingCount).toBe(initialCount);
  });
});
