import { test as base, expect } from "@playwright/test";

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
