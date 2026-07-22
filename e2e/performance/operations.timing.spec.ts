import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { measureUntilVisible, assertPerf } from "../helpers/perf-timer";
import { RESULTS_DIR, STORAGE_STATE_PATH, SAMPLE_POST_IDS_PATH } from "./constants";

test.use({ storageState: STORAGE_STATE_PATH });

function saveTimingReport(label: string, elapsedMs: number, thresholdMs: number) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(RESULTS_DIR, `timing-${label}-${ts}.json`);
  const passed = elapsedMs <= thresholdMs;
  fs.writeFileSync(
    file,
    JSON.stringify({ label, timestamp: new Date().toISOString(), elapsedMs, thresholdMs, passed }, null, 2)
  );
}

test.describe("操作応答時間", () => {
  test("いいねトグル: ボタン押下 → カウント変化（楽観的更新、< 300ms）", async ({ page }) => {
    const { samplePostId } = JSON.parse(fs.readFileSync(SAMPLE_POST_IDS_PATH, "utf-8")) as {
      samplePostId: string;
    };
    await page.goto(`/posts/${samplePostId}`);

    const likeBtn = page.locator('[data-testid="like-button"]');
    const likeCount = page.locator('[data-testid="like-count"]');
    await likeBtn.waitFor({ timeout: 10000 });

    const before = parseInt((await likeCount.textContent()) ?? "0", 10);

    const start = Date.now();
    await likeBtn.click();
    // 押下前が「未いいね」か「いいね済み」かでカウントの増減方向が変わるため、
    // 押下前の値と一致しなくなったこと自体を「反映された」とみなす
    await expect(likeCount).not.toHaveText(String(before), { timeout: 300 });
    const elapsed = Date.now() - start;

    saveTimingReport("like-toggle", elapsed, 300);
    assertPerf({ elapsedMs: elapsed }, 300, "いいね押下〜UI反映");
  });

  test("コメント投稿: 送信 → 一覧に反映（< 3000ms）", async ({ page }) => {
    const { samplePostId } = JSON.parse(fs.readFileSync(SAMPLE_POST_IDS_PATH, "utf-8")) as {
      samplePostId: string;
    };
    await page.goto(`/posts/${samplePostId}`);

    const comment = `perfテスト用コメント ${Date.now()}`;
    const textarea = page.locator('[data-testid="comment-textarea"]');
    await textarea.waitFor({ timeout: 10000 });
    await textarea.fill(comment);

    const result = await measureUntilVisible(
      page,
      () => page.click('[data-testid="comment-submit"]'),
      `[data-testid="comment-item"]:has-text("${comment}")`,
      { timeout: 3000 }
    );

    saveTimingReport("comment-create", result.elapsedMs, 3000);
    assertPerf(result, 3000, "コメント投稿〜一覧表示");
  });

  test("探すページ検索: 入力 → 結果表示（< 1000ms）", async ({ page }) => {
    await page.goto("/search");
    const input = page.locator('[data-testid="search-input"]');
    await input.waitFor({ timeout: 10000 });

    const start = Date.now();
    await input.fill("観光");
    await expect(page.locator('[data-testid="post-card"]').first()).toBeVisible({ timeout: 1000 });
    const elapsed = Date.now() - start;

    saveTimingReport("search", elapsed, 1000);
    assertPerf({ elapsedMs: elapsed }, 1000, "検索入力〜結果表示");
  });

  test("もっと見るページング: クリック → 追加カード表示（< 2000ms）", async ({ page }) => {
    await page.goto("/search");
    await page.locator('[data-testid="post-card"]').first().waitFor({ timeout: 10000 });
    const initialCount = await page.locator('[data-testid="post-card"]').count();

    const moreButton = page.locator('[data-testid="search-more-button"]');
    // シード済みDB（3,000件超）前提のため、次ページが無い状況は想定しない
    await moreButton.waitFor({ timeout: 10000 });

    const start = Date.now();
    await moreButton.click();
    await page.waitForFunction(
      (count: number) => document.querySelectorAll('[data-testid="post-card"]').length > count,
      initialCount,
      { timeout: 2000 }
    );
    const elapsed = Date.now() - start;

    saveTimingReport("infinite-scroll", elapsed, 2000);
    assertPerf({ elapsedMs: elapsed }, 2000, "もっと見る〜追加カード表示");
  });
});
