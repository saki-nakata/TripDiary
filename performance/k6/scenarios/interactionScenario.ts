import { sleep } from "k6";
import exec from "k6/execution";
import { toggleLikeRequest, postComment } from "../requests/apiRequests.ts";
import { samplePostIds, userForCurrentVu } from "../helpers/csv.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

const COMMENT_BODIES = [
  "参考になりました！",
  "私も行ってみたいです。",
  "写真が素敵ですね。",
  "詳しくありがとうございます。",
];

// いいね・コメント：mostLikedPostId（人気投稿＝ホットな行）に書き込みを集中させ、
// toggleLike/createCommentのトランザクション・行ロック競合を意図的に発生させる。
// 対象投稿は固定だが、コメント本文はVU/ITERから決定的に選び再現性を保つ。
export function interactionScenario(headers: RequestHeaders): void {
  const postId = samplePostIds.mostLikedPostId;

  // 「自分の投稿にはいいねできない」という実際の業務ルール（like.service.ts）による403を、
  // サーバー不具合と誤検知しないよう、投稿者自身が実行するVUではいいねをスキップする
  const currentUser = userForCurrentVu();
  if (currentUser.id !== samplePostIds.mostLikedPostAuthorId) {
    toggleLikeRequest(headers, postId);
    sleep(1);
  }

  const bodyIndex = (exec.vu.idInTest + exec.vu.iterationInInstance) % COMMENT_BODIES.length;
  postComment(headers, postId, COMMENT_BODIES[bodyIndex]);
  sleep(1);
}
