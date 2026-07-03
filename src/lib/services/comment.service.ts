import { createComment, findCommentById, deleteComment } from "@/lib/repositories/comment.repository";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function createCommentService(userId: string, postId: string, body: string) {
  // TODO: Phase 2 — コメント時に投稿者へ通知を生成する
  return createComment({ postId, authorId: userId, body });
}

export async function deleteCommentService(userId: string, commentId: string) {
  const comment = await findCommentById(commentId);
  if (!comment) throw new NotFoundError();
  // コメント本人または投稿オーナーが削除可能
  if (comment.authorId !== userId && comment.post.authorId !== userId) {
    throw new ForbiddenError();
  }
  return deleteComment(commentId);
}
