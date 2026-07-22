import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { collectWebVitals, assertWebVitals } from "../helpers/web-vitals";
import { RESULTS_DIR, STORAGE_STATE_PATH } from "./constants";

test.use({ storageState: STORAGE_STATE_PATH });

function saveReport(label: string, vitals: object) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(RESULTS_DIR, `perf-${label}-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify({ label, timestamp: new Date().toISOString(), vitals }, null, 2));
}

test.describe("ページ表示パフォーマンス", () => {
  test("トップページ（TTFB / FCP / LCP / CLS）", async ({ page }) => {
    await page.goto("/");
    // シード済みDB前提のため`test.skip()`は使わず、投稿カードが出ない場合はここで失敗させる
    await page.locator('[data-testid="post-card"]').first().waitFor({ timeout: 10000 });

    const vitals = await collectWebVitals(page);
    saveReport("home", vitals);

    assertWebVitals(vitals, {
      ttfb: 800,
      fcp: 1800,
      lcp: 2500,
      cls: 0.1,
    });
  });
});
