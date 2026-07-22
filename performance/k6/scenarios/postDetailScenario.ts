import { sleep } from "k6";
import { getPostDetailPage } from "../requests/pageRequests.ts";
import { getComments, getUnreadCount } from "../requests/apiRequests.ts";
import { samplePostIds } from "../helpers/csv.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

// 投稿詳細SSR：人気投稿（mostLikedPostId）と平均的な投稿（samplePostId）を半々で閲覧する。
export function postDetailScenario(headers: RequestHeaders): void {
  const postId = Math.random() < 0.5 ? samplePostIds.mostLikedPostId : samplePostIds.samplePostId;
  getPostDetailPage(headers, postId);
  getUnreadCount(headers);
  sleep(1);
  getComments(headers, postId);
  sleep(1);
}
