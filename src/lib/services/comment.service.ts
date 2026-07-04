import { createComment, findCommentById, deleteComment } from "@/lib/repositories/comment.repository";
import { findPostAuthorId } from "@/lib/repositories/post.repository";
import { createCommentNotification } from "@/lib/services/notification.service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function createCommentService(userId: string, postId: string, body: string) {
  const [comment, authorId] = await Promise.all([
    createComment({ postId, authorId: userId, body }),
    findPostAuthorId(postId),
  ]);

  if (authorId) {
    await createCommentNotification(userId, authorId, postId, body);
  }

  return comment;
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
