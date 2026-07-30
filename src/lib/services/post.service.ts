import { Prisma } from "@prisma/client";
import {
  findPostById,
  createPost,
  updatePost,
  deletePost,
  findStillReferencedUrls,
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
  findRelatedPosts,
} from "@/lib/repositories/post.repository";
import { findPlanAuthorId } from "@/lib/repositories/plan.repository";
import type { PostInput, PostUpdateInput } from "@/lib/validations/post";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "@/lib/errors";
import { deleteOwnedObjectsByUrl, isOwnedS3Url } from "@/lib/s3";

function assertOwnedImageUrls(imageUrls: string[], userId: string, existingUrls: string[]) {
  const invalid = imageUrls.filter((url) => !isOwnedS3Url(url, userId) && !existingUrls.includes(url));
  if (invalid.length > 0) {
    throw new ValidationError("Validation failed", {
      imageUrls: ["自分でアップロードした画像のみ設定できます"],
    });
  }
}

export async function createPostService(userId: string, data: PostInput) {
  if (data.planId) {
    const planAuthorId = await findPlanAuthorId(data.planId);
    if (!planAuthorId) throw new NotFoundError();
    if (planAuthorId !== userId) throw new ForbiddenError();
  }
  if (data.imageUrls !== undefined) {
    assertOwnedImageUrls(data.imageUrls, userId, []);
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

export async function findRelatedPostsService(postId: string, location: string, limit?: number) {
  return findRelatedPosts(postId, location, limit);
}

export async function findLocationCountsService() {
  return findLocationCounts();
}

export async function findPostForEditService(userId: string, id: string) {
  const post = await findPostById(id);
  if (!post) throw new NotFoundError();
  if (post.authorId !== userId) throw new ForbiddenError();
  return post;
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

export async function updatePostService(userId: string, id: string, data: PostUpdateInput) {
  const post = await findPostById(id);
  if (!post) throw new NotFoundError();
  if (post.authorId !== userId) throw new ForbiddenError();
  if (data.planId) {
    const planAuthorId = await findPlanAuthorId(data.planId);
    if (!planAuthorId) throw new NotFoundError();
    if (planAuthorId !== userId) throw new ForbiddenError();
  }

  const existingUrls = post.images.map((img: { url: string }) => img.url);
  const newImageUrls = data.imageUrls;
  if (newImageUrls !== undefined) {
    assertOwnedImageUrls(newImageUrls, userId, existingUrls);
  }

  let result;
  try {
    result = await updatePost(id, data, data.version);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ConflictError("他の画面で更新されています。再読み込みしてください。");
    }
    throw e;
  }

  if (newImageUrls !== undefined) {
    const orphaned = existingUrls.filter((url: string) => !newImageUrls.includes(url));
    if (orphaned.length > 0) {
      const stillReferenced = await findStillReferencedUrls(orphaned);
      const toDelete = orphaned.filter((url: string) => !stillReferenced.has(url));
      if (toDelete.length > 0) {
        await deleteOwnedObjectsByUrl(toDelete, post.authorId);
      }
    }
  }

  return result;
}

export async function deletePostService(userId: string, id: string) {
  const post = await findPostById(id);
  if (!post) throw new NotFoundError();
  if (post.authorId !== userId) throw new ForbiddenError();

  const result = await deletePost(id);

  const urls = post.images.map((img: { url: string }) => img.url);
  if (urls.length > 0) {
    const stillReferenced = await findStillReferencedUrls(urls);
    const toDelete = urls.filter((url: string) => !stillReferenced.has(url));
    if (toDelete.length > 0) {
      await deleteOwnedObjectsByUrl(toDelete, post.authorId);
    }
  }

  return result;
}
