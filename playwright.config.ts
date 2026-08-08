import { defineConfig, devices } from "@playwright/test";
import { DEMO_STORAGE_STATE_PATH } from "./e2e/demo/support/paths";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[playwright.config] ${name}が設定されていません。`);
  return value;
}

// 6-Cデモ動画撮影（.env.demo）専用のuse設定。demo-login/demoプロジェクトで共有する。
const demoPcUse = {
  video: {
    mode: "on" as const,
    size: { width: 1280, height: 720 },
    // 操作対象への視覚アノテーション（クリック位置のハイライト等）。無音動画で
    // クリック対象が分からなくなるのを防ぐ（recordVideo.showActions、Playwright実在API）。
    showActions: { position: "top-right" as const, duration: 800 },
  },
  launchOptions: { slowMo: 400 },
  actionTimeout: 20_000,
  // /api/test/cleanup用シークレットを本番へ空文字のまま送らないよう明示的に上書きする
  extraHTTPHeaders: {},
};

export default defineConfig({
  // CIの共有vCPUランナーは負荷スパイク時に一時的な遅延が出やすく、ローカルでは再現しない
  // 非決定的なフレークが起きることがある。並列（workers）は落とさず速度を保ったまま、
  // 失敗したテストだけ再実行して吸収する。
  retries: process.env.CI ? 2 : 0,
  // 既定のアサーション5秒は、CI高負荷時のSSR/描画遅延で超過しがち。全specへ一律に余裕を持たせる
  // （通過テストの所要時間には影響せず、待つのは遅延・失敗時のみ）。
  expect: {
    timeout: 10_000,
    // ローカル（公式Playwright Dockerイメージ等）で生成したbaselineと実CI
    // （ubuntu-latest + playwright install-deps）のフォントレンダリングは、
    // OS側パッケージが完全一致しないため数十〜百数十px程度のアンチエイリアシング
    // レベルの差が残ることがある（PR-7e、2026-08-04）。実際に検出された差分は
    // 全画面比較で最大0.01%程度のため、10倍の余裕を持たせて0.1%まで許容する。
    // 実際のバグ（配色変更漏れ等）は通常この閾値を大きく超えるため、検出力への
    // 影響は小さい。
    toHaveScreenshot: { maxDiffPixelRatio: 0.001 },
  },
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.DEMO === "1" ? requireEnv("DEMO_BASE_URL") : "http://localhost:3000",
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
  // PERF=1（.env.perf）・DEMO=1（.env.demo）のときはwebServerを無効化する。有効のままだと
  // `pnpm build && pnpm start`が.env.localの開発DBを対象に起動してしまい、perf:build/perf:start
  // 済みのサーバーや本番URLに接続するつもりが気づかず開発DBを相手にする事故につながる（8-1節）。
  webServer:
    process.env.PERF === "1" || process.env.DEMO === "1"
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
      // demo/はDEMO_USER_EMAIL等の撮影専用envに依存し、CIには無いため実行対象から外す
      testIgnore: ["**/performance/**", "**/demo/**"],
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
    // 6-Cデモ動画: ログイン専用（storageState保存のみ、副作用なし）
    {
      name: "demo-login",
      testDir: "./e2e/demo",
      testMatch: /00-auth\.setup\.ts/,
      retries: 0,
      workers: 1,
      timeout: 120_000,
      use: { ...devices["Desktop Chrome"], ...demoPcUse },
    },
    // 6-Cデモ動画: storageStateを再利用する本編01〜04
    {
      name: "demo",
      testDir: "./e2e/demo",
      testMatch: /0[1-4]-.*\.demo\.spec\.ts/,
      dependencies: ["demo-login"],
      retries: 0,
      workers: 1,
      timeout: 150_000,
      use: { ...devices["Desktop Chrome"], ...demoPcUse, storageState: DEMO_STORAGE_STATE_PATH },
    },
    // 6-Cデモ動画: モバイル（未ログイン→ログイン後の長押し操作）。書き込みは行わないが、
    // demo-loginが生成するstorageStateファイル（cookie抽出用）を読むため依存させ、実行順を
    // 保証する。ただしprojectのuse.storageStateは設定しない（開始時点は未ログイン状態にし、
    // spec内でcontext.addCookies()により途中からログイン状態へ切り替えるため）
    {
      name: "demo-mobile",
      testDir: "./e2e/demo",
      testMatch: /05-mobile\.demo\.spec\.ts/,
      dependencies: ["demo-login"],
      retries: 0,
      timeout: 120_000,
      use: {
        ...devices["iPhone 13"],
        video: { mode: "on" as const, size: devices["iPhone 13"].viewport! },
        launchOptions: { slowMo: 400 },
        extraHTTPHeaders: {},
      },
    },
  ],
});
