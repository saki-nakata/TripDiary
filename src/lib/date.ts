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

/** 投稿日時を「たった今 / N分前 / N時間前 / N日前 / YYYY/MM/DD」で表す。
 *  フォロー中フィードなど「いつ投稿されたか」を軽く示したい箇所で使う。 */
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return "たった今";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return formatDateSlash(d);
}

/** 投稿日時を「今日 / 昨日 / 今週 / 今月 / それ以前」のグループ見出しに振り分ける。
 *  フォロー中フィードの日付セパレータに使う。判定は暦（カレンダー）基準。 */
export function dateGroupLabel(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDay = Math.floor((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  if (diffDay <= 0) return "今日";
  if (diffDay === 1) return "昨日";
  if (diffDay < 7) return "今週";
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return "今月";
  return "それ以前";
}
