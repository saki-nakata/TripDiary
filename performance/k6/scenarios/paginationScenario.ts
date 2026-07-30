import { check, sleep } from "k6";
import {
  getUserComments,
  getUserCommentsReceived,
  getUserFollowers,
  getUserFollowing,
} from "../requests/apiRequests.ts";
import { paginationTargetUser } from "../helpers/csv.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

type PagedResponse = { nextCursor: string | null; hasMore: boolean };
type PagedFetcher = (headers: RequestHeaders, userId: string, cursor?: string) => ReturnType<typeof getUserComments>;

function firstArrayLength(body: unknown): number {
  if (!body || typeof body !== "object") return 0;
  const arrayEntry = Object.values(body as Record<string, unknown>).find((v) => Array.isArray(v));
  return Array.isArray(arrayEntry) ? arrayEntry.length : 0;
}

// 1ページ目を取得し、hasMore/nextCursorを検証したうえで2ページ目まで取得する。
// GATE-22種類B対応の完了条件（負荷試験対象への追加）を満たすため、単なるstatus 200だけでなく
// 「実際にページングが機能していること」（hasMore=true・cursorあり・2ページ目が空でない）を
// checks: rate==1 の対象にする
function checkTwoPages(label: string, headers: RequestHeaders, userId: string, fetcher: PagedFetcher): void {
  const page1 = fetcher(headers, userId);
  const page1Body = page1.json() as PagedResponse | null;

  check(page1, {
    [`${label}: page1 hasMore=true`]: () => page1Body?.hasMore === true,
    [`${label}: page1 has nextCursor`]: () => typeof page1Body?.nextCursor === "string" && page1Body.nextCursor.length > 0,
  });

  if (!page1Body?.nextCursor) return;

  const page2 = fetcher(headers, userId, page1Body.nextCursor);
  check(page2, {
    [`${label}: page2 is not empty`]: () => firstArrayLength(page2.json()) > 0,
  });
}

// GATE-22種類B（コメント・フォロワー/フォロー中）のcursorページングを負荷試験対象に含める専用シナリオ。
// 対象は51件以上を決定的に保証したシードユーザー（performance/seed.tsのpaginationTargetUserId）に固定する。
// 通常のfollowScenario（VUごとに別ユーザーのプロフィールを閲覧する）へ混在させると、対象を固定した
// 瞬間に自己フォロー・単一行への不自然な書き込み集中を招くため専用シナリオとして分離した
// （読み取り専用でDB書き込みは行わない）。comments-receivedは本人限定APIのため、setup()で
// 対象ユーザー自身としてログインしたheadersを受け取って使う
export function paginationScenario(targetHeaders: RequestHeaders): void {
  const target = paginationTargetUser();

  checkTwoPages("users_comments_written", targetHeaders, target.id, getUserComments);
  sleep(0.5);
  checkTwoPages("users_comments_received", targetHeaders, target.id, getUserCommentsReceived);
  sleep(0.5);
  checkTwoPages("users_followers", targetHeaders, target.id, getUserFollowers);
  sleep(0.5);
  checkTwoPages("users_following", targetHeaders, target.id, getUserFollowing);
  sleep(0.5);
}
