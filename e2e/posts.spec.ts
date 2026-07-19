import { test, expect } from "@playwright/test";
import { createSolidColorPng } from "./utils/testImage";
import { pickDate } from "./utils/dateField";

const TEST_EMAIL = "test_playwright_posts@example.com";
const TEST_USER = {
  nickname: "投稿テストユーザー",
  email: TEST_EMAIL,
  password: "Password1234",
};

const POST = {
  title: `E2Eテスト投稿_${Date.now()}`,
  body: "Playwrightから作成したテスト投稿です。",
  location: "東京都",
  category: "観光",
};

let postId = "";

// 各テストがモジュールレベルの `postId` を共有しているため、同一ワーカーでの順次実行を保証する
// （通常のdescribeだとテスト失敗時にPlaywrightが後続テストを別ワーカーへ再割り当てすることがあり、
// その場合 `postId` が空文字にリセットされ意図しない404が発生する。2026-07-06 調査で判明）
test.describe.serial("投稿の主要フロー（作成 → 詳細表示 → いいね → コメント）", () => {
  test.beforeAll(async ({ request }) => {
    // 既存ユーザーがいれば削除してからテスト用ユーザーを作成（他E2Eと同じ隔離方式）
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

  test("投稿作成 → ホーム画面にハイライト表示される", async ({ page }) => {
    await page.goto("/posts/new");

    await page.fill('input[name="title"]', POST.title);
    await page.fill('textarea[name="body"]', POST.body);
    await page.selectOption('select[name="location"]', POST.location);
    await page.selectOption('select[name="category"]', POST.category);
    await pickDate(page, "visited-at-field", "2026-01-01");

    await page.click('button[type="submit"]');

    // PostForm は投稿成功後 `/?highlighted=<id>` へ遷移する（ホームでのスクロール&ハイライト演出）
    await expect(page).toHaveURL(/\?highlighted=/);
    const url = new URL(page.url());
    postId = url.searchParams.get("highlighted") ?? "";
    expect(postId).not.toBe("");

    await expect(page.locator(`[data-post-id="${postId}"]`).first()).toBeVisible();
  });

  test("投稿詳細 → タイトル・本文が表示される", async ({ page }) => {
    await page.goto(`/posts/${postId}`);

    await expect(page.getByRole("heading", { name: POST.title })).toBeVisible();
    await expect(page.getByText(POST.body)).toBeVisible();
  });

  test("ホームのカードの💬アイコンをクリック → 投稿詳細のコメント欄へ遷移する", async ({ page }) => {
    await page.goto("/");

    const card = page.locator(`[data-post-id="${postId}"]`).first();
    await card.getByTestId("comment-icon-link").click();

    await expect(page).toHaveURL(new RegExp(`/posts/${postId}#comments`));
    await expect(page.getByRole("heading", { name: "💬 コメント" })).toBeInViewport();
  });

  // 自分の投稿にはいいねできない仕様のため、いいねのトグル自体の検証は
  // like.service.test.ts（自分の投稿以外に対するトグル）でカバーする。

  test("コメント投稿 → 一覧に反映される", async ({ page }) => {
    await page.goto(`/posts/${postId}`);

    const commentBody = `E2Eコメント_${Date.now()}`;
    await page.getByTestId("comment-textarea").fill(commentBody);

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/comments") && res.request().method() === "POST"
      ),
      page.getByRole("button", { name: "コメントを投稿" }).click(),
    ]);
    expect(response.status()).toBe(201);

    await expect(page.getByTestId("comment-item").filter({ hasText: commentBody })).toBeVisible();
  });

  test("投稿削除 → ホーム画面へ遷移する", async ({ page }) => {
    await page.goto(`/posts/${postId}`);

    await page.getByTestId("delete-post-button").click();
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page).toHaveURL("/", { timeout: 5000 });
  });

  test("複数枚の写真をアップロードし、ドラッグ&ドロップで並び替えて保存できる", async ({ page }) => {
    await page.goto("/posts/new");

    await page.fill('input[name="title"]', `E2E画像並び替えテスト_${Date.now()}`);
    await page.fill('textarea[name="body"]', "画像並び替えのE2Eテストです。");
    await page.selectOption('select[name="location"]', "東京都");
    await page.selectOption('select[name="category"]', "観光");
    await pickDate(page, "visited-at-field", "2026-01-01");

    await page.locator('input[type="file"]').setInputFiles([
      { name: "red.png", mimeType: "image/png", buffer: createSolidColorPng(255, 0, 0) },
      { name: "green.png", mimeType: "image/png", buffer: createSolidColorPng(0, 255, 0) },
      { name: "blue.png", mimeType: "image/png", buffer: createSolidColorPng(0, 0, 255) },
    ]);

    const thumbs = page.locator(".group");
    await expect(thumbs).toHaveCount(3, { timeout: 10000 });
    await expect(page.getByText("（ドラッグ&ドロップで並び順を変更できます）")).toBeVisible();

    const photoImg = thumbs.locator('img[alt^="写真"]');
    const beforeSrcs = await photoImg.evaluateAll((els) => els.map((e) => e.getAttribute("src")));

    // 1枚目を3枚目の位置までドラッグして並び替える
    const firstBox = await thumbs.nth(0).boundingBox();
    const thirdBox = await thumbs.nth(2).boundingBox();
    if (!firstBox || !thirdBox) throw new Error("サムネイルの座標が取得できません");
    const startX = firstBox.x + firstBox.width / 2;
    const startY = firstBox.y + firstBox.height / 2;
    const endX = thirdBox.x + thirdBox.width / 2;
    const endY = thirdBox.y + thirdBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(startX + (endX - startX) * (i / 10), startY + (endY - startY) * (i / 10), { steps: 5 });
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(200);

    const afterSrcs = await photoImg.evaluateAll((els) => els.map((e) => e.getAttribute("src")));
    expect(afterSrcs).not.toEqual(beforeSrcs);
    expect([...afterSrcs].sort()).toEqual([...beforeSrcs].sort());
    expect(afterSrcs[0]).not.toBe(beforeSrcs[0]);

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\?highlighted=/);
    const url = new URL(page.url());
    const newPostId = url.searchParams.get("highlighted") ?? "";

    await page.goto(`/posts/${newPostId}`);
    const detailSrcs = await page.locator('img[sizes="72px"]').evaluateAll((els) =>
      els.map((e) => {
        const src = e.getAttribute("src") ?? "";
        const encoded = new URL(src, "http://localhost").searchParams.get("url");
        return encoded ? decodeURIComponent(encoded) : src;
      })
    );
    expect(detailSrcs).toEqual(afterSrcs);
  });
});
