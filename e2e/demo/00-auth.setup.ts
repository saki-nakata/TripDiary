import { test } from "@playwright/test";
import { installPseudoCursor } from "./support/cursor";
import { loginAsDemo } from "./support/demoAuth";
import { assertDemoWriteAllowed } from "./support/guard";

// demo-loginプロジェクト専用。ログインとstorageStateの保存だけを行い、副作用（いいね・
// コメント等の書き込み）は一切行わない（実装計画書の設計判断6）。これにより、01〜04の
// dependencies経由の再実行が起きても「もう一度ログインするだけ」で済み、コンテンツが
// 壊れることはない。
test("ログイン（副作用なし）", async ({ page }) => {
  assertDemoWriteAllowed();
  await installPseudoCursor(page);

  // 未ログイン状態のトップページ。投稿量・「ログイン」「新規登録」ボタンを見せる
  await page.goto("/");
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(2000);

  await loginAsDemo(page);

  // ログイン後の探索ポータルで静止
  await page.waitForTimeout(1500);
});
