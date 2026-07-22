import { sleep } from "k6";
import { getMypageReportPage } from "../requests/pageRequests.ts";
import { getStats, getStatsYears } from "../requests/apiRequests.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

// mypage report: 集計系（GROUP BY等）はフィード系より重いクエリになりやすいため独立して計測する。
export function mypageReportScenario(headers: RequestHeaders): void {
  getMypageReportPage(headers);
  sleep(1);
  getStatsYears(headers);
  getStats(headers, "all");
  sleep(1);
}
