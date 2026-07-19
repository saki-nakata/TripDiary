import { test, expect } from "@playwright/test";
import { pickDate } from "./utils/dateField";

const USER_A = {
  nickname: "フォローテストA",
  email: "test_playwright_users_a@example.com",
  password: "Password1234",
};
const USER_B = {
  nickname: "フォローテストB",
  email: "test_playwright_users_b@example.com",
  password: "Password1234",
};

const B_POST_TITLE = `E2Eフォロー先投稿_${Date.now()}`;
const NEW_NICKNAME = "フォローテストA編集後";
const NEW_BIO = "Playwrightから編集した自己紹介です。";

let userAId = "";
let userBId = "";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 15000 });
}

// 各テストがモジュールレベルの `userAId`/`userBId` を共有しているため、同一ワーカーでの順次実行を保証する
// （posts.spec.ts と同じ理由。2026-07-06 調査で判明）
test.describe.serial("フォロー・マイページ・プロフィール設定フロー", () => {
  test.beforeAll(async ({ request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(USER_A.email)}`);
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(USER_B.email)}`);

    const resA = await request.post("/api/auth/signup", { data: USER_A });
    userAId = (await resA.json()).id;
    const resB = await request.post("/api/auth/signup", { data: USER_B });
    userBId = (await resB.json()).id;
  });

  test("Bが投稿を作成する", async ({ page }) => {
    await login(page, USER_B.email, USER_B.password);

    await page.goto("/posts/new");
    await page.fill('input[name="title"]', B_POST_TITLE);
    await page.fill('textarea[name="body"]', "フォロー機能E2E用のテスト投稿です。");
    await page.selectOption('select[name="location"]', "東京都");
    await page.selectOption('select[name="category"]', "観光");
    await pickDate(page, "visited-at-field", "2026-01-01");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\?highlighted=/);
  });

  test("AがBのプロフィールでフォローする", async ({ page }) => {
    await login(page, USER_A.email, USER_A.password);

    await page.goto(`/users/${userBId}`);
    await expect(page.getByRole("heading", { name: USER_B.nickname })).toBeVisible();

    // プロフィールページはモバイル用・デスクトップ用の2つのフォローボタンをCSSの
    // 表示切り替えのみで同時にDOMへ描画しているため、可視の方に絞り込む
    const followButton = page.locator('[data-testid="follow-button"]:visible');
    await expect(followButton).toBeVisible();
    await expect(followButton).not.toContainText("フォロー中");

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/follow") && res.request().method() === "POST"),
      followButton.click(),
    ]);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ following: true });

    // クリック直後はマウスがボタン上に残り hover 文言（「フォロー中を解除」）に切り替わるため、
    // マウスを離してから通常表示（「フォロー中」）を検証する
    await page.mouse.move(0, 0);
    await expect(followButton).toContainText("フォロー中");
    await expect(page.getByText("フォローしました")).toBeVisible();
  });

  test("Aのマイページのフォロー中タブにBの投稿が表示される", async ({ page }) => {
    await login(page, USER_A.email, USER_A.password);

    await page.goto("/mypage?tab=follow-feed");

    await expect(page.getByText(B_POST_TITLE)).toBeVisible();
  });

  test("Aがもう一度フォローボタンを押すとアンフォローされる", async ({ page }) => {
    await login(page, USER_A.email, USER_A.password);

    await page.goto(`/users/${userBId}`);
    const followingButton = page.locator('[data-testid="follow-button"]:visible');
    await expect(followingButton).toContainText("フォロー中");

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/follow") && res.request().method() === "POST"),
      followingButton.click(),
    ]);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ following: false });

    await expect(followingButton).not.toContainText("フォロー中");
  });

  test("Aが設定画面でプロフィールを編集する", async ({ page }) => {
    await login(page, USER_A.email, USER_A.password);

    await page.goto("/settings");
    await page.fill('input[name="nickname"]', NEW_NICKNAME);
    await page.fill('textarea[name="bio"]', NEW_BIO);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(`/users/${userAId}`);
    await expect(page.getByRole("heading", { name: NEW_NICKNAME })).toBeVisible();
    await expect(page.getByText(NEW_BIO)).toBeVisible();
  });

  test("Aが他人のプロフィールでは戻るボタンが表示され、自分のプロフィールでは表示されない", async ({ page }) => {
    await login(page, USER_A.email, USER_A.password);

    await page.goto(`/users/${userBId}`);
    await expect(page.getByRole("heading", { name: USER_B.nickname })).toBeVisible();
    await expect(page.getByRole("button", { name: "戻る" })).toBeVisible();

    await page.goto(`/users/${userAId}`);
    await expect(page.getByRole("heading", { name: NEW_NICKNAME })).toBeVisible();
    await expect(page.getByRole("button", { name: "戻る" })).toHaveCount(0);
  });
});
