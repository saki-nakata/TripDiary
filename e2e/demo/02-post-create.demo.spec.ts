import { test, expect } from "@playwright/test";
import { installPseudoCursor } from "./support/cursor";
import { assertDemoWriteAllowed } from "./support/guard";
import { DEMO_POST } from "./support/content";
import { UPLOAD_IMAGE_PATH, UPLOAD_IMAGE_PATH_2 } from "./support/uploadConstants";
import { pickDate } from "../utils/dateField";

async function waitForLeafletTiles(page: import("@playwright/test").Page) {
  await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".leaflet-tile:not(.leaflet-tile-loaded)")).toHaveCount(0, { timeout: 15_000 });
}

// storageState済み。地図・複数枚画像アップロードを含む「投稿する」フロー。参照動画
// （1フォームをゆっくり見せる密度）に合わせ、詰め込みすぎず各入力に間を置く。
test("投稿する（地図・複数枚画像）", async ({ page }) => {
  assertDemoWriteAllowed();
  await installPseudoCursor(page);

  await page.goto("/");
  await page.waitForTimeout(800);

  const newPostLink = page.locator("aside").getByRole("link", { name: "新規投稿" });
  await newPostLink.hover();
  await newPostLink.click();
  await expect(page).toHaveURL("/posts/new");
  await page.waitForTimeout(1000);

  const titleInput = page.locator('input[name="title"]');
  await titleInput.hover();
  await titleInput.fill(DEMO_POST.title);
  await page.waitForTimeout(500);

  const bodyTextarea = page.locator('textarea[name="body"]');
  await bodyTextarea.hover();
  await bodyTextarea.fill(DEMO_POST.body);
  await page.waitForTimeout(500);

  const categorySelect = page.locator('select[name="category"]');
  await categorySelect.hover();
  await categorySelect.selectOption(DEMO_POST.category);
  await page.waitForTimeout(500);

  const locationSelect = page.locator('select[name="location"]');
  await locationSelect.hover();
  await locationSelect.selectOption(DEMO_POST.location);
  await page.waitForTimeout(500);

  // 評価
  const fiveStars = page.getByRole("button", { name: "5星" });
  await fiveStars.hover();
  await fiveStars.click();
  await page.waitForTimeout(500);

  // 訪問日（本日固定。DateFieldは過去方向にしか戻れないため）
  const today = new Date().toISOString().slice(0, 10);
  await pickDate(page, "visited-at-field", today);
  await page.waitForTimeout(500);

  // 地図でピンを立てる（地図初期表示は東京駅中心・zoom 5のため、コンテナ中央付近をクリックして
  // 東京都内に収める。固定ピクセル座標だと実際のコンテナ幅次第で数百km離れた地点になりうる）
  await waitForLeafletTiles(page);
  const mapContainer = page.locator(".leaflet-container").first();
  const mapBox = await mapContainer.boundingBox();
  if (!mapBox) throw new Error("leaflet-container のbounding boxが取得できませんでした");
  await mapContainer.click({ position: { x: mapBox.width / 2 + 15, y: mapBox.height / 2 - 10 } });
  await page.waitForTimeout(1000);

  const expandMapButton = page.getByRole("button", { name: /地図拡大表示/ });
  await expandMapButton.hover();
  await expandMapButton.click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "閉じる" }).click();
  await page.waitForTimeout(500);

  // 画像2枚（並べ替えは行わない）
  await page.locator('input[type="file"]').setInputFiles([UPLOAD_IMAGE_PATH, UPLOAD_IMAGE_PATH_2]);
  await page.waitForTimeout(2000);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.hover();
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith("/api/posts") && res.request().method() === "POST"),
    submitButton.click(),
  ]);
  const created = await response.json();

  await expect(page).toHaveURL(new RegExp(`\\?highlighted=${created.id}`), { timeout: 15_000 });
  await page.waitForTimeout(1500);

  const highlightedCard = page.locator(`[data-testid="post-card"][data-post-id="${created.id}"]`);
  await highlightedCard.scrollIntoViewIfNeeded();
  await highlightedCard.hover();
  await highlightedCard.click();

  await expect(page).toHaveURL(`/posts/${created.id}`);
  await expect(page.locator("img.cursor-pointer").first()).toBeVisible({ timeout: 15_000 });
  await waitForLeafletTiles(page);
  await page.waitForTimeout(1500);
});
