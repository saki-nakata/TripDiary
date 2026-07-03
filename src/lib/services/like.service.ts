import { toggleLike } from "@/lib/repositories/like.repository";

export async function toggleLikeService(userId: string, postId: string) {
  // TODO: Phase 2 — いいね時に投稿者へ通知を生成する
  return toggleLike(userId, postId);
}
