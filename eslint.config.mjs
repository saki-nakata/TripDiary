import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prototype code (plain HTML/JS, not part of Next.js app)
    "prototype/**",
    // Vitest coverage report (generated)
    "coverage/**",
    // k6 run output (generated)
    "performance/k6/results/**",
  ]),
  // k6スクリプト（Phase 5-B）。globalIgnoresで丸ごと除外せず検査対象に含めるが、
  // k6固有のグローバル（__VU等）とNext固有ルールの誤検知だけをここで無効化する
  {
    files: ["performance/k6/**/*.ts"],
    languageOptions: {
      globals: { __VU: "readonly", __ITER: "readonly", __ENV: "readonly", open: "readonly" },
    },
    rules: {
      // k6のsimulationは `export default function` がエントリポイントの標準パターンのため、
      // Next.js向けの匿名default export禁止ルールは誤検知になる
      "import/no-anonymous-default-export": "off",
    },
  },
]);

export default eslintConfig;
