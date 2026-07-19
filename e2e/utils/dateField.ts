import type { Page } from "@playwright/test";

/**
 * DateField（カレンダー形式の日付選択）を開き、指定日をクリックして選択する。
 * value の直接 fill ができない独自コンポーネントのため、ボタンクリック→必要な回数
 * 前月へ戻る→対象日クリック、という実際の操作をエミュレートする。
 */
export async function pickDate(page: Page, testId: string, dateStr: string) {
  const [targetYear, targetMonth] = dateStr.split("-").map(Number);

  await page.getByTestId(testId).click();

  const today = new Date();
  const monthsBack =
    (today.getFullYear() * 12 + today.getMonth()) - (targetYear * 12 + (targetMonth - 1));

  const prevButton = page.getByRole("button", { name: "‹" });
  for (let i = 0; i < monthsBack; i++) {
    await prevButton.click();
  }

  await page.locator(`button[data-date="${dateStr}"]`).click();
}
