import { sleep } from "k6";
import { getHomePage } from "../requests/pageRequests.ts";
import { getExplorePosts, getPortalData, getUnreadCount } from "../requests/apiRequests.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

// フィード読み取り：トップページSSR＋探すAPI＋未読通知数＋エリア別集計（探すページの「エリア」タブ）。
// Sidebarはレイアウト常設でunread-countを毎ページビュー叩くため、SSRページの後に必ず呼ぶ
// （呼ばないと実トラフィックを過小評価する）。
export function feedScenario(headers: RequestHeaders): void {
  getHomePage(headers);
  getUnreadCount(headers);
  sleep(1);
  getExplorePosts(headers, Math.random() < 0.5 ? "latest" : "popular");
  getPortalData(headers);
  sleep(1);
}
