import { test, expect } from "./fixtures";
import { pickDate } from "./utils/dateField";
import { createSolidColorPng } from "./utils/testImage";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST, WCAG_LARGE_TEXT_MIN_CONTRAST } from "./helpers/contrast";

// PR-7c（GATE-40、DR-02グループD: 投稿フォーム・カード）の検証。
// 対象: PostForm.tsx・DateField.tsx・DeleteButton.tsx・FollowFeed.tsx・
// RemovableSavedCard.tsx・SavedMapSection.tsx・ImageCarousel.tsx・
// posts/new・posts/[id]/edit・mypage。
//
// スクリーンショット比較（toHaveScreenshot）に使うテキストは、Date.now()等の
// 実行のたびに変わる値を含めない（baseline撮影時と次回実行で必ず差分になり、
// スクリーンショット比較の再現性が失われるため）。DB上の一意性が必要な投稿
// タイトルにはDate.now()を使うが、その投稿を画面に表示したままスクリーンショットは撮らない。

const TEST_EMAIL = "test_playwright_dark_theme_post_forms@example.com";
const TEST_USER = {
  nickname: "PR7c確認用ユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};
// スクリーンショット比較専用の固定文字列（DB保存はしないテストでのみ使用）
const STATIC_FORM_TITLE = "ダークモード確認用スポット";
const POST = {
  title: `PR7cダークモード確認用投稿_${Date.now()}`,
  body: "投稿フォーム系のダークテーマ確認用に作成したテスト投稿です。",
  location: "東京都",
  category: "観光",
};

test.describe("PR-7c: 投稿フォーム・カードのダークテーマ対応", () => {
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
    test(`投稿作成フォームが読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/posts/new");

      const titleLabel = page.getByText("スポット名", { exact: false }).first();
      await expect(titleLabel).toBeVisible();
      expect(await getContrastRatio(titleLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // DB保存しない（送信しない）ため、一意性のためのDate.now()は使わず固定文字列で入力する。
      // baselineスクリーンショットに含まれる文字列が実行のたびに変わらないようにするため。
      await page.fill('input[name="title"]', STATIC_FORM_TITLE);
      const dateField = page.getByTestId("visited-at-field");
      await expect(dateField).toBeVisible();
      expect(await getContrastRatio(dateField)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const costLabel = page.getByText("費用内訳", { exact: true });
      await expect(costLabel).toBeVisible();
      expect(await getContrastRatio(costLabel)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      // 未選択の★（StarRating、readonlyなしの操作可能なコントロール）はWCAG 1.4.11の
      // 非活性コントロール基準（3:1）で判定する（第4ラウンドレビューB-4、ライト側の是正）
      const unselectedStar = page.getByLabel("1星").locator("span");
      await expect(unselectedStar).toBeVisible();
      expect(await getContrastRatio(unselectedStar)).toBeGreaterThanOrEqual(WCAG_LARGE_TEXT_MIN_CONTRAST);

      const submitButton = page.getByRole("button", { name: "投稿する" });
      await expect(submitButton).toBeVisible();
      expect(await getContrastRatio(submitButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(page).toHaveScreenshot(`post-form-new-${colorScheme}.png`, { fullPage: false });
    });

    test(`訪問日カレンダーを開いた状態が読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/posts/new");

      // 固定日付（実行時刻に依存しない）を選択してから再度開き、選択状態（bg-green-700+白文字）も検証する
      await pickDate(page, "visited-at-field", "2026-01-05");
      await page.getByTestId("visited-at-field").click();

      const calendar = page.getByTestId("visited-at-field-calendar");
      await expect(calendar).toBeVisible();

      const monthCaption = calendar.getByText(/^\d{4}年\d{1,2}月$/);
      await expect(monthCaption).toBeVisible();
      expect(await getContrastRatio(monthCaption)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const prevButton = calendar.getByRole("button", { name: "‹" });
      await expect(prevButton).toBeVisible();
      expect(await getContrastRatio(prevButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const selectedDay = calendar.locator('[data-date="2026-01-05"]');
      await expect(selectedDay).toBeVisible();
      expect(await getContrastRatio(selectedDay)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      const otherDay = calendar.locator('[data-date="2026-01-10"]');
      await expect(otherDay).toBeVisible();
      expect(await getContrastRatio(otherDay)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

      await expect(calendar).toHaveScreenshot(`post-form-datefield-calendar-${colorScheme}.png`);
    });
  }

  test("投稿を作成・編集し、マイページ一覧・削除確認ダイアログがダークモードで読める", async ({ page }) => {
    await page.goto("/posts/new");
    await page.fill('input[name="title"]', POST.title);
    await page.fill('textarea[name="body"]', POST.body);
    await page.selectOption('select[name="location"]', POST.location);
    await page.selectOption('select[name="category"]', POST.category);
    await pickDate(page, "visited-at-field", "2026-01-01");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\?highlighted=/);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });

    // マイページの自分の投稿タブ（一覧カード・削除/編集アイコン）
    await page.goto("/mypage?tab=myposts");
    const heading = page.getByRole("heading", { name: "自分の投稿" });
    await expect(heading).toBeVisible();
    expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const postCard = page.getByText(POST.title).first();
    await expect(postCard).toBeVisible();
    expect(await getContrastRatio(postCard)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 編集画面
    await page.getByTitle("編集").first().click();
    await expect(page).toHaveURL(/\/posts\/.+\/edit/);
    const editHeading = page.getByRole("heading", { name: "旅の記録を編集する" });
    await expect(editHeading).toBeVisible();
    expect(await getContrastRatio(editHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // 削除確認ダイアログ（MyPostActions経由、ConfirmDialog使用）
    await page.goto("/mypage?tab=myposts");
    await page.getByTitle("削除").first().click();
    const dialogTitle = page.getByText("投稿を削除しますか？");
    await expect(dialogTitle).toBeVisible();
    expect(await getContrastRatio(dialogTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await page.getByRole("button", { name: "キャンセル" }).click();
  });

  test("投稿詳細ページで画像付きカルーセルとDeleteButton本体がダークモードで読める", async ({ page }) => {
    // ImageCarouselのUI検証（ダークモードでのコンテナ背景・DeleteButton等）に実S3アップロードは
    // 不要なため、アップロードAPIをモックする。実S3アップロード自体（認証情報・バケット設定を
    // 要する）はローカルのAWS認証情報がない環境では失敗するため、認証済み環境で別途検証する。
    // 投稿作成APIは`uploads/{ログインユーザーid}/...`形式のS3 URL（isOwnedS3Url）のみを許可するため、
    // モックURLもこの形式に合わせる必要がある（S3ホスト名はAWS_REGION/AWS_S3_BUCKET_NAMEから決まる）。
    // request（グローバルfixture）はCookieを共有しないため、必ずpage.requestを使う
    const session = await (await page.request.get("/api/auth/session")).json();
    const userId = session.user.id as string;
    const mockImageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/uploads/${userId}/teal.png`;
    await page.route("**/api/upload/post", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: mockImageUrl }),
      });
    });

    await page.goto("/posts/new");
    await page.fill('input[name="title"]', `${POST.title}_detail`);
    await page.fill('textarea[name="body"]', POST.body);
    await page.selectOption('select[name="location"]', POST.location);
    await page.selectOption('select[name="category"]', POST.category);
    await pickDate(page, "visited-at-field", "2026-01-04");
    await page.locator('input[type="file"]').setInputFiles([
      { name: "teal.png", mimeType: "image/png", buffer: createSolidColorPng(20, 184, 166) },
    ]);
    const thumbnail = page.locator("form").getByAltText("写真 1");
    await expect(thumbnail).toBeVisible();
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\?highlighted=/);

    const postId = new URL(page.url()).searchParams.get("highlighted");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/posts/${postId}`);

    // ImageCarousel: 画像なし投稿では`return null`のため、確実に描画させるには画像付き投稿が必要
    await expect(page.locator("img").first()).toBeVisible();

    // DeleteButton本体（投稿詳細ページ、MyPostActionsのConfirmDialogとは別コンポーネント）
    const deleteButton = page.getByTestId("delete-post-button");
    await expect(deleteButton).toBeVisible();
    expect(await getContrastRatio(deleteButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    await deleteButton.click();
    const dialogTitle = page.getByText("投稿を削除しますか？");
    await expect(dialogTitle).toBeVisible();
    expect(await getContrastRatio(dialogTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    const cancelButton = page.getByRole("button", { name: "キャンセル" });
    expect(await getContrastRatio(cancelButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await cancelButton.click();
  });

  test("行きたいに追加した投稿のカード・SavedMapSection（凡例・ハイライト・地図に戻る）・外す確認ダイアログがダークモードで読める", async ({ page }) => {
    await page.goto("/posts/new");
    await page.fill('input[name="title"]', `${POST.title}_wishlist`);
    await page.fill('textarea[name="body"]', POST.body);
    await page.selectOption('select[name="location"]', POST.location);
    await page.selectOption('select[name="category"]', POST.category);
    await pickDate(page, "visited-at-field", "2026-01-02");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\?highlighted=/);

    const postId = new URL(page.url()).searchParams.get("highlighted");
    await page.request.post(`/api/posts/${postId}/wishlist`);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/mypage?tab=wishlist");

    const heading = page.getByRole("heading", { name: "行きたい" });
    await expect(heading).toBeVisible();
    expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // SavedMapSection: 凡例
    const legendFew = page.getByText("少ない", { exact: true });
    await expect(legendFew).toBeVisible();
    expect(await getContrastRatio(legendFew)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // SavedMapSection: 地図クリックでのハイライト・スクロール（東京都に対応する要素へ絞り込む）。
    // 投稿1件・ビューポート900pxだと地図領域が十分に長い一覧の下にあるとは限らず、
    // IntersectionObserverが「地図が画面外」と判定できないため、高さを縮めて地図を画面外に出す
    await page.setViewportSize({ width: 1280, height: 500 });
    const prefecture = page.locator("svg g.prefecture[data-code]:not([fill='#e4e4e7'])");
    await expect(prefecture).toHaveCount(1);
    const mapArea = page.locator("svg:has(g.prefecture[data-code])").locator("xpath=..");
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // 都道府県のSVG形状は細長く不規則なため、boundingBox中心への座標クリックだと
    // パス自体を外れることがある（addEventListener("click", ...)がSVG要素へ直接
    // 付与されているため、座標クリックではなく要素上でclickイベントを直接発火させる）。
    // これはハイライト・スクロール・「地図に戻る」導線のダークテーマ確認が目的のため妥当だが、
    // 実際にポインタでその座標をクリックできるか（当たり判定）までは検証しない。その観点は
    // 必要になれば`g[data-code]`配下の実パス要素を対象にした別テストで補う
    await prefecture.evaluate((el) => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

    // クリックが実際にスクロールを発生させたことを確認してから、地図領域が画面外に
    // 出たこと（IntersectionObserverが「地図に戻る」ボタンを出す条件）を確認する。
    // 単に見出しの表示だけを見ると、画面外でもDOM上は表示状態のため誤って成功しうる。
    // SavedMapSectionのobserverは`rootMargin: "-56px 0px 0px 0px"`（実効ルート上端を56px
    // 下げる）で判定するため、閾値も0ではなく56に合わせる
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
    await expect
      .poll(() => mapArea.evaluate((el) => el.getBoundingClientRect().bottom))
      .toBeLessThanOrEqual(56);

    const locationHeading = page.getByRole("heading", { name: POST.location });
    await expect(locationHeading).toBeVisible();
    expect(await getContrastRatio(locationHeading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    // SavedMapSection: 地図に戻るボタン（地図領域が画面外に出ると表示される）
    const backToMapButton = page.getByRole("button", { name: "地図に戻る" });
    await expect(backToMapButton).toBeVisible();
    expect(await getContrastRatio(backToMapButton)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await backToMapButton.click();

    await page.getByRole("button", { name: "行きたいから外す" }).first().click();
    const confirmTitle = page.getByText("「行きたい」から外しますか？");
    await expect(confirmTitle).toBeVisible();
    expect(await getContrastRatio(confirmTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
    await page.getByRole("button", { name: "キャンセル" }).click();
  });
});

// EmptyState（DR-02の対象ファイル一覧には含まれないが、マイページの複数タブから直接
// 描画されるため`mypage/page.tsx`対応の一部として検証する）は、データが1件もない
// フレッシュなアカウントでしか表示されないため、他テストと別アカウントを使う。
const EMPTY_TEST_EMAIL = "test_playwright_dark_theme_post_forms_empty@example.com";
const EMPTY_TEST_USER = {
  nickname: "PR7c空状態確認用ユーザー",
  email: EMPTY_TEST_EMAIL,
  password: "Password1234",
};

test.describe("PR-7c: EmptyStateのダークテーマ対応", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(EMPTY_TEST_EMAIL)}`);
    await request.post("/api/auth/signup", { data: EMPTY_TEST_USER });
  });

  test("行きたいリストが空のときEmptyStateがダークモードで読める", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", EMPTY_TEST_USER.email);
    await page.fill("#password", EMPTY_TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15000 });

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/mypage?tab=wishlist");

    // getByText()はモバイル/PC用に重複描画されたDOMを両方拾うことがあるため、
    // main配下かつ表示中の要素へ絞り込み、1件であることを確認してから検証する
    const emptyMessage = page
      .locator("main")
      .getByText("行きたいリストがまだありません", { exact: true })
      .filter({ visible: true });
    await expect(emptyMessage).toHaveCount(1);
    await expect(emptyMessage).toBeVisible();
    expect(await getContrastRatio(emptyMessage)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const cta = page.locator("main").getByRole("link", { name: "スポットを探す" }).filter({ visible: true });
    await expect(cta).toHaveCount(1);
    await expect(cta).toBeVisible();
    expect(await getContrastRatio(cta)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });
});

const FOLLOW_TARGET_EMAIL = "test_playwright_dark_theme_post_forms_target@example.com";
const FOLLOW_TARGET = {
  nickname: "PR7cフォロー対象",
  email: FOLLOW_TARGET_EMAIL,
  password: "Password1234",
};
const FOLLOW_POST_TITLE = `PR7cフォローフィード確認用投稿_${Date.now()}`;
let followTargetId = "";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 15000 });
}

// FollowFeed.tsx（SNS風フィードカード）は、他ユーザーをフォローしていて相手の投稿がある
// 状態でしか描画されないため、専用のフォロー関係を用意する（users.spec.tsと同じ理由でserial実行）
test.describe.serial("PR-7c: フォロー中フィードのダークテーマ対応", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(FOLLOW_TARGET_EMAIL)}`);
    const res = await request.post("/api/auth/signup", { data: FOLLOW_TARGET });
    followTargetId = (await res.json()).id;
  });

  test("フォロー対象が投稿を作成する", async ({ page }) => {
    await login(page, FOLLOW_TARGET.email, FOLLOW_TARGET.password);

    await page.goto("/posts/new");
    await page.fill('input[name="title"]', FOLLOW_POST_TITLE);
    await page.fill('textarea[name="body"]', POST.body);
    await page.selectOption('select[name="location"]', POST.location);
    await page.selectOption('select[name="category"]', POST.category);
    await pickDate(page, "visited-at-field", "2026-01-03");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\?highlighted=/);
  });

  test("フォローしてフィードのカードがダークモードで読める", async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    await page.goto(`/users/${followTargetId}`);
    const followButton = page.locator('[data-testid="follow-button"]:visible');
    await expect(followButton).toBeVisible();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/follow") && res.request().method() === "POST"),
      followButton.click(),
    ]);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/mypage?tab=follow-feed");

    const heading = page.getByRole("heading", { name: "フォロー中の投稿" });
    await expect(heading).toBeVisible();
    expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const postTitle = page.getByText(FOLLOW_POST_TITLE);
    await expect(postTitle).toBeVisible();
    expect(await getContrastRatio(postTitle)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);

    const authorName = page.getByText(FOLLOW_TARGET.nickname);
    await expect(authorName).toBeVisible();
    expect(await getContrastRatio(authorName)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
  });
});
