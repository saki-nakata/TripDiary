import path from "node:path";
import { config as loadEnv } from "dotenv";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

loadEnv({ path: path.resolve(__dirname, ".env.test") });

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "performance/**/*.test.ts"],
    // Repositoryテストは実DBに対して全件deleteManyでクリーンアップするため、
    // 複数テストファイルを並列実行すると共有テーブルの競合でFK制約違反等が発生する。
    // ファイル間は直列実行する（ファイル内のテストはこれまで通り高速）。
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // フロントエンド（src/components・src/lib/validations）は対象外。
      // UIロジックはコンポーネントテスト・E2Eでカバーする方針のため、
      // バックエンド（services/repositories/app/api）に限定して計測する（Phase 5-C-2で決定）。
      include: ["src/lib/services/**", "src/lib/repositories/**", "src/app/api/**"],
      // 2026-07-24時点の実測値（Statements 87.52% / Branches 77.1% / Functions 80.4% / Lines 88.16%）から
      // 数ポイントの余裕を持たせて設定。既存の穴を今すぐ塞ぐための閾値ではなく、
      // 今後の劣化（カバレッジの後退）を検知するための下限値（Phase 5-C-2）。
      thresholds: {
        statements: 85,
        branches: 75,
        functions: 78,
        lines: 86,
      },
    },
  },
});
