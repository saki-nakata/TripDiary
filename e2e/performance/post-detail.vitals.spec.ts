import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { collectWebVitals, assertWebVitals } from "../helpers/web-vitals";
import { RESULTS_DIR, STORAGE_STATE_PATH, SAMPLE_POST_IDS_PATH } from "./constants";

test.use({ storageState: STORAGE_STATE_PATH });

function saveReport(label: string, vitals: object) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(RESULTS_DIR, `perf-${label}-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify({ label, timestamp: new Date().toISOString(), vitals }, null, 2));
}

test.describe("ページ表示パフォーマンス", () => {
  test("投稿詳細ページ（人気投稿、TTFB / FCP / LCP）", async ({ page }) => {
    const { mostLikedPostId } = JSON.parse(fs.readFileSync(SAMPLE_POST_IDS_PATH, "utf-8")) as {
      mostLikedPostId: string;
    };

    await page.goto(`/posts/${mostLikedPostId}`);
    await page.locator('[data-testid="like-button"]').waitFor({ timeout: 10000 });

    const vitals = await collectWebVitals(page);
    saveReport("post-detail", vitals);

    assertWebVitals(vitals, {
      ttfb: 800,
      fcp: 1800,
      lcp: 2500,
    });
  });
});
