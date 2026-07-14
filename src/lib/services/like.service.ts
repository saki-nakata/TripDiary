import { toggleLike } from "@/lib/repositories/like.repository";
import { findPostAuthorId } from "@/lib/repositories/post.repository";
import { createLikeNotification } from "@/lib/services/notification.service";
import { ForbiddenError } from "@/lib/errors";

export async function toggleLikeService(userId: string, postId: string) {
  const authorId = await findPostAuthorId(postId);
  if (authorId === userId) {
    throw new ForbiddenError("自分の投稿にはいいねできません");
  }

  const result = await toggleLike(userId, postId);

  if (result.liked && authorId) {
    await createLikeNotification(userId, authorId, postId);
  }

  return result;
}
