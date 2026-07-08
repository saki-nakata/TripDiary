import {
  findPostById,
  createPost,
  updatePost,
  deletePost,
  findExplorePosts,
  findFollowingPosts,
  findPopularPosts,
  findLatestPosts,
  findLocationCounts,
  findCategoryCounts,
  findTopRatedByCategory,
} from "@/lib/repositories/post.repository";
import type { PostInput } from "@/lib/validations/post";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function createPostService(userId: string, data: PostInput) {
  return createPost(userId, data);
}

export async function findPostByIdService(id: string, viewerId?: string) {
  const post = await findPostById(id, viewerId);
  if (!post) throw new NotFoundError();
  return post;
}

export async function findExplorePostsService(options: Parameters<typeof findExplorePosts>[0]) {
  return findExplorePosts(options);
}

export async function findFollowingPostsService(options: Parameters<typeof findFollowingPosts>[0]) {
  return findFollowingPosts(options);
}

export async function getPortalDataService() {
  const [popular, latest, locations, categories] = await Promise.all([
    findPopularPosts(6),
    findLatestPosts(6),
    findLocationCounts(),
    findCategoryCounts(),
  ]);
  const topRated = await findTopRatedByCategory(popular.map((p) => p.id));

  return { popular, latest, locations, categories, topRated };
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
