import { test, expect } from "./fixtures";
import { getContrastRatio, WCAG_NORMAL_TEXT_MIN_CONTRAST } from "./helpers/contrast";
import { createSolidColorPng } from "./utils/testImage";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Browser, Page } from "@playwright/test";

const TEST_USER = {
  email: "test_playwright_dark_theme_remaining_v2@example.com",
  nickname: "PR7f確認用ユーザー",
  password: "Password1234",
};
const mockMapTile = createSolidColorPng(148, 163, 184);

async function signInAndCreatePost(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill("#email", TEST_USER.email);
  await page.fill("#password", TEST_USER.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL("/", { timeout: 15_000 });

  const response = await page.request.post("/api/posts", {
    data: {
      title: "PR7f ダークテーマ確認投稿",
      body: "通知・プロフィール・投稿詳細のダークテーマ確認用投稿です。",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      lat: 35.681236,
      lng: 139.767125,
    },
  });
  expect(response.status()).toBe(201);
  return response.json() as Promise<{ id: string }>;
}

test.describe("PR-7f: 残存画面のライト/ダーク比較", () => {
  test.beforeEach(async ({ page, request }) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(TEST_USER.email)}`);
    const signup = await request.post("/api/auth/signup", { data: TEST_USER });
    expect(signup.status()).toBe(201);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.route("**.tile.openstreetmap.org/**", (route) =>
      route.fulfill({ status: 200, contentType: "image/png", body: mockMapTile })
    );
    await page.route("**/unpkg.com/leaflet@*/dist/images/**", (route) =>
      route.fulfill({ status: 200, contentType: "image/png", body: mockMapTile })
    );
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`通知の空状態が読める（${colorScheme}）`, async ({ page }) => {
      await signInAndCreatePost(page);
      await page.emulateMedia({ colorScheme });
      await page.goto("/notification");

      const heading = page.getByRole("heading", { name: "通知" });
      await expect(heading).toBeVisible();
      expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      await expect(page.getByText("まだ通知はありません")).toBeVisible();
      await expect(page.locator("main")).toHaveScreenshot(`notification-empty-${colorScheme}.png`);
    });

    test(`プロフィールが読める（${colorScheme}）`, async ({ page }) => {
      await signInAndCreatePost(page);
      await page.emulateMedia({ colorScheme });
      // サイドバーの本人導線から実IDのプロフィールページへ移動する。
      await page.getByRole("link", { name: "プロフィール", exact: true }).first().click();

      const heading = page.getByRole("heading", { name: TEST_USER.nickname });
      await expect(heading).toBeVisible();
      expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      await expect(page.locator("main")).toHaveScreenshot(`profile-${colorScheme}.png`);
    });

    test(`投稿詳細と地図枠が読める（${colorScheme}）`, async ({ page }) => {
      const post = await signInAndCreatePost(page);
      await page.emulateMedia({ colorScheme });
      await page.goto(`/posts/${post.id}`);

      const heading = page.getByRole("heading", { name: "PR7f ダークテーマ確認投稿" });
      await expect(heading).toBeVisible();
      expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      await expect(page.locator(".leaflet-container")).toBeVisible();
      await expect(page.locator("main")).toHaveScreenshot(`post-detail-${colorScheme}.png`, {
        mask: [page.locator(".leaflet-container")],
      });
    });

    test(`プラン地図が読める（${colorScheme}）`, async ({ page }) => {
      const post = await signInAndCreatePost(page);
      const planResponse = await page.request.post("/api/plans", {
        data: { title: "PR7f 地図確認プラン", spots: [{ type: "post", postId: post.id }] },
      });
      expect(planResponse.status()).toBe(201);
      const plan = (await planResponse.json()) as { id: string };

      await page.emulateMedia({ colorScheme });
      await page.goto(`/plans/${plan.id}`);
      const map = page.locator(".leaflet-container");
      await expect(map).toBeVisible();
      await expect(map).toHaveScreenshot(`plan-map-${colorScheme}.png`);
    });

    test(`404画面が読める（${colorScheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto("/this-route-does-not-exist");

      const heading = page.getByRole("heading").first();
      await expect(heading).toBeVisible();
      expect(await getContrastRatio(heading)).toBeGreaterThanOrEqual(WCAG_NORMAL_TEXT_MIN_CONTRAST);
      await expect(page.locator("body")).toHaveScreenshot(`not-found-${colorScheme}.png`);
    });
  }
});

// 操作系の確認では登録・UIログインをテストケースから切り離す。専用アカウントを一度だけ
// 作成し、保存した認証状態から各ケースの独立したブラウザコンテキストを開く。
const INTERACTION_OWNER = {
  email: "test_playwright_dark_theme_owner_v2@example.com",
  nickname: "PR7f投稿者",
  password: "Password1234",
};
const INTERACTION_VIEWER = {
  email: "test_playwright_dark_theme_viewer_v2@example.com",
  nickname: "PR7f閲覧者",
  password: "Password1234",
};

let interactionOwnerId = "";
let ownerStatePath = "";
let viewerStatePath = "";

async function saveSignedInState(browser: Browser, user: typeof INTERACTION_OWNER, statePath: string) {
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();
  try {
    await page.goto("/login");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/", { timeout: 15_000 });
    await context.storageState({ path: statePath });
  } finally {
    await context.close();
  }
}

async function openSignedInPage(browser: Browser, storageState: string, colorScheme: "light" | "dark") {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
    storageState,
    colorScheme,
    viewport: { width: 1280, height: 900 },
  });
  return { context, page: await context.newPage() };
}

async function createInteractionPost(page: Page) {
  const response = await page.request.post("/api/posts", {
    data: {
      title: "PR7f 操作確認投稿",
      body: "投稿詳細の操作、コメント、プロフィール一覧、旅行レポートの確認用投稿です。",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      lat: 35.681236,
      lng: 139.767125,
    },
  });
  expect(response.status()).toBe(201);
  return response.json() as Promise<{ id: string }>;
}

test.describe.serial("PR-7f: 実データの操作・一覧・旅行レポート", () => {
  test.beforeAll(async ({ browser, request }, testInfo) => {
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(INTERACTION_OWNER.email)}`);
    await request.delete(`/api/test/cleanup?email=${encodeURIComponent(INTERACTION_VIEWER.email)}`);

    const ownerSignup = await request.post("/api/auth/signup", { data: INTERACTION_OWNER });
    expect(ownerSignup.status()).toBe(201);
    interactionOwnerId = (await ownerSignup.json() as { id: string }).id;
    const viewerSignup = await request.post("/api/auth/signup", { data: INTERACTION_VIEWER });
    expect(viewerSignup.status()).toBe(201);

    const authDir = join(testInfo.project.outputDir, ".auth");
    mkdirSync(authDir, { recursive: true });
    ownerStatePath = join(authDir, "pr7f-owner.json");
    viewerStatePath = join(authDir, "pr7f-viewer.json");
    await saveSignedInState(browser, INTERACTION_OWNER, ownerStatePath);
    await saveSignedInState(browser, INTERACTION_VIEWER, viewerStatePath);
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`投稿詳細の操作とコメントが読める（${colorScheme}）`, async ({ browser }) => {
      const owner = await openSignedInPage(browser, ownerStatePath, colorScheme);
      const post = await createInteractionPost(owner.page);
      await owner.context.close();

      const viewer = await openSignedInPage(browser, viewerStatePath, colorScheme);
      try {
        await viewer.page.goto(`/posts/${post.id}`);
        await expect(viewer.page.getByTestId("like-button")).toBeVisible();
        await viewer.page.getByTestId("like-button").click();
        await viewer.page.getByTitle("行きたいに追加").click();
        await viewer.page.getByTitle("訪問済みにする").click();
        await viewer.page.getByTestId("comment-textarea").fill("PR-7fのコメント表示確認です。");
        await viewer.page.getByTestId("comment-submit").click();
        await expect(viewer.page.getByTestId("comment-item")).toContainText("PR-7fのコメント表示確認です。");
        await expect(viewer.page.locator("#comments")).toHaveScreenshot(`post-detail-actions-comments-${colorScheme}.png`);
      } finally {
        await viewer.context.close();
      }
    });

    test(`プロフィールのコメント・フォロワー一覧が読める（${colorScheme}）`, async ({ browser }) => {
      const owner = await openSignedInPage(browser, ownerStatePath, colorScheme);
      const post = await createInteractionPost(owner.page);
      await owner.context.close();

      const viewer = await openSignedInPage(browser, viewerStatePath, colorScheme);
      try {
        await viewer.page.goto(`/users/${interactionOwnerId}`);
        const followButton = viewer.page.locator('[data-testid="follow-button"]:visible');
        if (!(await followButton.innerText()).includes("フォロー中")) {
          await followButton.click();
        }
        await viewer.page.goto(`/posts/${post.id}`);
        await viewer.page.getByTestId("comment-textarea").fill("プロフィール一覧確認用コメントです。");
        await viewer.page.getByTestId("comment-submit").click();
        await expect(viewer.page.getByTestId("comment-item")).toBeVisible();
      } finally {
        await viewer.context.close();
      }

      const ownerAgain = await openSignedInPage(browser, ownerStatePath, colorScheme);
      try {
        await ownerAgain.page.goto(`/users/${interactionOwnerId}?tab=comments-received`);
        await expect(ownerAgain.page.getByText("プロフィール一覧確認用コメントです。").first()).toBeVisible();
        await expect(ownerAgain.page.locator("main")).toHaveScreenshot(`profile-comments-received-${colorScheme}.png`);
        await ownerAgain.page.goto(`/users/${interactionOwnerId}?tab=followers`);
        await expect(ownerAgain.page.getByText(INTERACTION_VIEWER.nickname)).toBeVisible();
      } finally {
        await ownerAgain.context.close();
      }
    });

    test(`旅行レポートの集計カードとバッジが読める（${colorScheme}）`, async ({ browser }) => {
      const owner = await openSignedInPage(browser, ownerStatePath, colorScheme);
      try {
        await createInteractionPost(owner.page);
        await owner.page.goto("/mypage?tab=report");
        await expect(owner.page.getByRole("heading", { name: "旅行レポート" })).toBeVisible();
        await expect(owner.page.getByRole("button", { name: /投稿数/ })).toBeVisible();
        await expect(owner.page.getByText("東京都").first()).toBeVisible();
        await expect(owner.page.locator("main")).toHaveScreenshot(`mypage-report-${colorScheme}.png`);
      } finally {
        await owner.context.close();
      }
    });
  }
});
