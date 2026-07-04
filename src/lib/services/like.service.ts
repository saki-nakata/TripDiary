import { toggleLike } from "@/lib/repositories/like.repository";
import { findPostAuthorId } from "@/lib/repositories/post.repository";
import { createLikeNotification } from "@/lib/services/notification.service";

export async function toggleLikeService(userId: string, postId: string) {
  const [result, authorId] = await Promise.all([
    toggleLike(userId, postId),
    findPostAuthorId(postId),
  ]);

  if (result.liked && authorId) {
    await createLikeNotification(userId, authorId, postId);
  }

  return result;
}
