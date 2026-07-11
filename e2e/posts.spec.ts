import { test, expect } from "@playwright/test";

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
    await page.fill('input[name="visitedAt"]', "2026-01-01");

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

  test("いいね → トグルされ件数が1増える", async ({ page }) => {
    await page.goto(`/posts/${postId}`);

    const likeButton = page.getByTestId("like-button");
    await expect(likeButton).toContainText("0");

    await likeButton.click();

    await expect(likeButton.locator("img")).toHaveAttribute("alt", "❤️");
    await expect(likeButton).toContainText("1");
  });

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
});
