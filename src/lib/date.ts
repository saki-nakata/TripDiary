/** 日付表示を "YYYY/MM/DD"（月日をゼロ埋め）に統一するための共通フォーマッタ。
 *  `toLocaleDateString("ja-JP")` は月日をゼロ埋めしないため、画面ごとに
 *  "2026/7/18" と "2026/07/18" が混在する原因になっていた。 */
export function formatDateSlash(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}
