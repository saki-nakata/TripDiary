import { Page } from "@playwright/test";

export type TimerResult = {
  elapsedMs: number;
};

/**
 * ある操作を実行し、指定セレクタが表示されるまでの時間を計測する
 */
export async function measureUntilVisible(
  page: Page,
  action: () => Promise<void>,
  selector: string,
  options?: { timeout?: number }
): Promise<TimerResult> {
  const start = Date.now();
  await action();
  await page.waitForSelector(selector, { state: "visible", timeout: options?.timeout ?? 10000 });
  return { elapsedMs: Date.now() - start };
}

/**
 * ある操作を実行し、DOM の特定テキストが変化するまでの時間を計測する
 */
export async function measureUntilTextChanges(
  page: Page,
  action: () => Promise<void>,
  selector: string,
  expectedText: string,
  options?: { timeout?: number }
): Promise<TimerResult> {
  const start = Date.now();
  await action();
  await page.waitForFunction(
    ({ sel, text }: { sel: string; text: string }) => {
      const el = document.querySelector(sel);
      return el?.textContent?.includes(text) ?? false;
    },
    { sel: selector, text: expectedText },
    { timeout: options?.timeout ?? 10000 }
  );
  return { elapsedMs: Date.now() - start };
}

export function assertPerf(result: TimerResult, thresholdMs: number, label: string) {
  if (result.elapsedMs > thresholdMs) {
    throw new Error(`[Perf] ${label}: ${result.elapsedMs}ms が閾値 ${thresholdMs}ms を超えています`);
  }
}
