import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = process.cwd();
const reportPath = path.join(root, "performance", "k6", "results", "index.html");
const outputDir = path.join(root, "docs", "images");

async function main() {
  if (!existsSync(reportPath)) throw new Error(`集約レポートが見つかりません: ${reportPath}`);

  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto(`file:///${reportPath.replace(/\\/g, "/")}`);
  // README用の静止画ではタブの色遷移途中や過去のFAIL履歴を写さない。
  await page.addStyleTag({ content: "*{transition:none !important;animation:none !important}" });
  await page.locator(".section-label").evaluateAll((labels) => {
    for (const label of labels) {
      if (!label.textContent?.includes("全実行結果一覧")) continue;
      (label as HTMLElement).style.display = "none";
      const table = label.nextElementSibling as HTMLElement | null;
      if (table) table.style.display = "none";
    }
  });

  for (const tab of ["smoke", "load", "stress", "spike", "webvitals"]) {
    await page.locator(`.tab-${tab}`).click();
    await page.screenshot({ path: path.join(outputDir, `performance-${tab}.png`), fullPage: true });
  }

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
