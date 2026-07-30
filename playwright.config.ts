import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // CIの共有vCPUランナーは負荷スパイク時に一時的な遅延が出やすく、ローカルでは再現しない
  // 非決定的なフレークが起きることがある。並列（workers）は落とさず速度を保ったまま、
  // 失敗したテストだけ再実行して吸収する。
  retries: process.env.CI ? 2 : 0,
  // 既定のアサーション5秒は、CI高負荷時のSSR/描画遅延で超過しがち。全specへ一律に余裕を持たせる
  // （通過テストの所要時間には影響せず、待つのは遅延・失敗時のみ）。
  expect: { timeout: 10_000 },
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: !!process.env.CI,
    // CIで再現するDOM重複の原因調査用。失敗時だけ証跡を残す。
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // クリック等のアクションと画面遷移の既定タイムアウトも、CI高負荷を見込んで延長する
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // /api/test/cleanup の追加認証用シークレット（GATE-03）。各specから個別に付与せず
    // ここで全リクエストに共通付与する。未設定時は空文字を送るため、サーバー側は403で拒否する
    extraHTTPHeaders: { "x-test-cleanup-secret": process.env.TEST_CLEANUP_SECRET ?? "" },
  },
  // PERF=1（.env.perf）のときはwebServerを無効化する。有効のままだと`pnpm build && pnpm start`が
  // .env.localの開発DBを対象に起動してしまい、perf:build/perf:start済みのサーバーに接続する
  // つもりが気づかず開発DBを相手に計測する事故につながる（8-1節）。
  webServer:
    process.env.PERF === "1"
      ? undefined
      : {
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
    // perf専用のログイン処理（storageState生成）。perfプロジェクトの前提として1回だけ実行する
    {
      name: "perf-setup",
      testDir: "./e2e/performance",
      testMatch: /perf\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // パフォーマンス計測（Web Vitals・操作応答時間）。perf専用DBのシードデータに依存するため
    // CIには含めず、pnpm perf:vitals でローカル手動実行する（Phase 5-B）
    {
      name: "perf",
      testDir: "./e2e/performance",
      testIgnore: "**/perf.setup.ts",
      dependencies: ["perf-setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
