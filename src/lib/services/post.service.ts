import {
  findPostById,
  createPost,
  updatePost,
  deletePost,
  findExplorePosts,
  findFollowingPosts,
  findPostsByAuthorId,
  findWishlistedPosts,
  findVisitedPosts,
  countFollowingFeedPosts,
  findPopularPosts,
  findLatestPosts,
  findLocationCounts,
  findCategoryCounts,
  findTopRatedByCategory,
} from "@/lib/repositories/post.repository";
import { findPlanAuthorId } from "@/lib/repositories/plan.repository";
import type { PostInput } from "@/lib/validations/post";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

export async function createPostService(userId: string, data: PostInput) {
  if (data.planId) {
    const planAuthorId = await findPlanAuthorId(data.planId);
    if (!planAuthorId) throw new NotFoundError();
    if (planAuthorId !== userId) throw new ForbiddenError();
  }
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

export async function findPostsByAuthorIdService(options: Parameters<typeof findPostsByAuthorId>[0]) {
  return findPostsByAuthorId(options);
}

export async function findWishlistedPostsService(options: Parameters<typeof findWishlistedPosts>[0]) {
  return findWishlistedPosts(options);
}

export async function findVisitedPostsService(options: Parameters<typeof findVisitedPosts>[0]) {
  return findVisitedPosts(options);
}

export async function countFollowingFeedPostsService(userId: string) {
  return countFollowingFeedPosts(userId);
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
  if (data.planId) {
    const planAuthorId = await findPlanAuthorId(data.planId);
    if (!planAuthorId) throw new NotFoundError();
    if (planAuthorId !== userId) throw new ForbiddenError();
  }
  return updatePost(id, data);
}

export async function deletePostService(userId: string, id: string) {
  const post = await findPostById(id);
  if (!post) throw new NotFoundError();
  if (post.authorId !== userId) throw new ForbiddenError();
  return deletePost(id);
}
