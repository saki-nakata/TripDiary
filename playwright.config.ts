import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: !!process.env.CI,
  },
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // 通常のE2E（機能フロー検証）。CIでは --project=e2e で実行する
    {
      name: "e2e",
      testDir: "./e2e",
      testIgnore: "**/performance/**",
      use: { ...devices["Desktop Chrome"] },
    },
    // パフォーマンス計測（Web Vitals等）。perf専用DBのシードデータに依存するため
    // CIには含めず、pnpm perf:vitals でローカル手動実行する（Phase 5-B）
    {
      name: "perf",
      testDir: "./e2e/performance",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
