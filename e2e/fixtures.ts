import { test as base, expect } from "@playwright/test";
import { createSolidColorPng } from "./utils/testImage";

const dummyS3Hostname =
  process.env.AWS_S3_BUCKET_NAME && process.env.AWS_REGION
    ? `${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`
    : null;
const mockS3Image = createSolidColorPng(20, 184, 166);

// 投稿画像アップロードE2Eでは、所有権検証を通すためダミーS3 URLをDBへ保存する。
// next/image はブラウザではなくNext.jsサーバーから元URLを取得するため、upload APIだけを
// page.route()でモックしても、後続画面で`/_next/image`がダミーS3へ404を出してしまう。
// 全E2E contextでoptimizerリクエストを横取りし、ダミーS3 URLだけを1px PNGで返す。
// 実S3 URLやUnsplash等の通常画像リクエストはそのままNext.jsへ渡す。
base.beforeEach(async ({ page }) => {
  await page.route("**/_next/image**", async (route) => {
    const sourceUrl = new URL(route.request().url()).searchParams.get("url");
    if (dummyS3Hostname && sourceUrl?.startsWith(`https://${dummyS3Hostname}/uploads/`)) {
      await route.fulfill({ status: 200, contentType: "image/png", body: mockS3Image });
      return;
    }
    await route.continue();
  });
});

base.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;

  try {
    await testInfo.attach("page-url.txt", {
      body: page.url(),
      contentType: "text/plain",
    });
    await testInfo.attach("page.html", {
      body: await page.content(),
      contentType: "text/html",
    });
  } catch {
    // Preserve the original test error when the page has already closed.
  }
});

export const test = base;
export { expect };
