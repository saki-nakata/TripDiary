import { findPostById, createPost, updatePost, deletePost } from "@/lib/repositories/post.repository";
import type { PostInput } from "@/lib/validations/post";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function createPostService(userId: string, data: PostInput) {
  return createPost(userId, data);
}

export async function updatePostService(userId: string, id: string, data: PostInput) {
  const post = await findPostById(id);
  if (!post) throw new NotFoundError();
  if (post.authorId !== userId) throw new ForbiddenError();
  return updatePost(id, data);
}

export async function deletePostService(userId: string, id: string) {
  const post = await findPostById(id);
  if (!post) throw new NotFoundError();
  if (post.authorId !== userId) throw new ForbiddenError();
  return deletePost(id);
}
