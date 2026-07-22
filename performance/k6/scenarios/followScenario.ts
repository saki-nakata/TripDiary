import { sleep } from "k6";
import { getUserProfilePage } from "../requests/pageRequests.ts";
import { toggleFollowRequest } from "../requests/apiRequests.ts";
import { otherUserForCurrentVu } from "../helpers/csv.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

// フォロー・プロフィール閲覧：自分以外のユーザー（名簿上「次のユーザー」、決定的に選ぶ）の
// プロフィールページを閲覧し、フォロー状態をトグルする。TimeLineの「Profile」シナリオに相当するが、
// TripDiaryでは他ユーザーの投稿一覧・フォロー中バッジを表示するSSRページが実在するため、
// 単なるプロフィール取得APIではなくSSRページ自体を第一級の測定対象とする。
export function followScenario(headers: RequestHeaders): void {
  const target = otherUserForCurrentVu();
  getUserProfilePage(headers, target.id);
  sleep(1);
  toggleFollowRequest(headers, target.id);
  sleep(1);
}
