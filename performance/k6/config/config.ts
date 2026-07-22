export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
export const TIMEOUT = "10s";

// k6のデフォルトのsummaryTrendStatsはavg/min/med/max/p(90)/p(95)のみでp(99)を含まない。
// 指定しないとJSON/HTMLレポートのp99が常にnull（0扱い）になり、Spikeのrecovery区間の
// p99回復確認やLoadの閾値確定（p95/p99は実測後に確定）が実質できなくなる不具合があったため、
// 全simulationで明示的に含める。
export const SUMMARY_TREND_STATS = ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"];
