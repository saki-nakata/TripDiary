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
  test("マイページ 集計レポート（TTFB / FCP / LCP / CLS）", async ({ page }) => {
    await page.goto("/mypage?tab=report");
    // 集計系（GROUP BY等）はフィード系より重いクエリになりやすく、独立して計測する対象
    await page.getByText("投稿数").first().waitFor({ timeout: 10000 });

    const vitals = await collectWebVitals(page);
    saveReport("mypage-report", vitals);

    assertWebVitals(vitals, {
      ttfb: 800,
      fcp: 1800,
      lcp: 2500,
      // スケルトン/カードのアニメーション表示があるため、通常ページより緩和する
      cls: 0.25,
    });
  });
});
