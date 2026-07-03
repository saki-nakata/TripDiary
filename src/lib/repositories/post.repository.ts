import { prisma } from "@/lib/prisma";
import type { PostInput } from "@/lib/validations/post";

const POST_SELECT = {
  id: true,
  title: true,
  body: true,
  prefecture: true,
  category: true,
  rating: true,
  visitedAt: true,
  cost: true,
  costBreakdown: true,
  lat: true,
  lng: true,
  planId: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, nickname: true, image: true },
  },
  images: {
    select: { id: true, url: true, displayOrder: true },
    orderBy: { displayOrder: "asc" as const },
  },
  _count: {
    select: { likes: true, comments: true },
  },
} as const;

export async function findPostById(id: string, userId?: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      ...POST_SELECT,
      likes: userId ? { where: { userId }, select: { userId: true } } : false,
      wishlists: userId ? { where: { userId }, select: { userId: true } } : false,
      visited: userId ? { where: { userId }, select: { userId: true } } : false,
    },
  });
  if (!post) return null;
  return formatPost(post, userId);
}

export async function findExplorePosts({
  cursor,
  limit = 20,
  sort = "latest",
  category,
  prefecture,
  userId,
}: {
  cursor?: string;
  limit?: number;
  sort?: "latest" | "popular";
  category?: string;
  prefecture?: string;
  userId?: string;
}) {
  const where = {
    ...(category && { category }),
    ...(prefecture && { prefecture }),
  };

  const posts = await prisma.post.findMany({
    where,
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: sort === "popular" ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }] : { createdAt: "desc" },
    select: {
      ...POST_SELECT,
      likes: userId ? { where: { userId }, select: { userId: true } } : false,
      wishlists: userId ? { where: { userId }, select: { userId: true } } : false,
      visited: userId ? { where: { userId }, select: { userId: true } } : false,
    },
  });

  return paginateResults(posts, limit, userId);
}

export async function findFollowingPosts({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const posts = await prisma.post.findMany({
    where: { authorId: { in: [userId, ...followingIds] } },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: "desc" },
    select: {
      ...POST_SELECT,
      likes: { where: { userId }, select: { userId: true } },
      wishlists: { where: { userId }, select: { userId: true } },
      visited: { where: { userId }, select: { userId: true } },
    },
  });

  return paginateResults(posts, limit, userId);
}

export async function findFeaturedPosts(limit = 5) {
  const posts = await prisma.post.findMany({
    take: limit,
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
    select: {
      ...POST_SELECT,
      likes: false,
      wishlists: false,
      visited: false,
    },
  });
  return posts.map((p) => formatPost(p));
}

export async function findPopularPosts(limit = 6) {
  return findFeaturedPosts(limit);
}

export async function findLatestPosts(limit = 6) {
  const posts = await prisma.post.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      ...POST_SELECT,
      likes: false,
      wishlists: false,
      visited: false,
    },
  });
  return posts.map((p) => formatPost(p));
}

export async function findRelatedPosts(postId: string, prefecture: string, limit = 3) {
  return prisma.post.findMany({
    where: { prefecture, id: { not: postId } },
    take: limit,
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
    select: {
      ...POST_SELECT,
      likes: false,
      wishlists: false,
      visited: false,
    },
  });
}

export async function createPost(authorId: string, data: PostInput) {
  const { costBreakdown, ...rest } = data;
  const cost = costBreakdown?.reduce((sum, item) => sum + item.amount, 0) ?? null;

  return prisma.post.create({
    data: {
      ...rest,
      authorId,
      cost,
      costBreakdown: costBreakdown ?? undefined,
      visitedAt: new Date(rest.visitedAt),
    },
    select: { id: true },
  });
}

export async function updatePost(id: string, data: PostInput) {
  const { costBreakdown, ...rest } = data;
  const cost = costBreakdown?.reduce((sum, item) => sum + item.amount, 0) ?? null;

  return prisma.post.update({
    where: { id },
    data: {
      ...rest,
      cost,
      costBreakdown: costBreakdown ?? undefined,
      visitedAt: new Date(rest.visitedAt),
    },
    select: { id: true },
  });
}

export async function deletePost(id: string) {
  return prisma.post.delete({ where: { id } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paginateResults(posts: any[], limit: number, userId?: string) {
  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  return {
    posts: items.map((p) => formatPost(p, userId)),
    nextCursor,
    hasMore,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPost(post: any, userId?: string) {
  const { likes, wishlists, visited, ...rest } = post;
  return {
    ...rest,
    visitedAt: rest.visitedAt instanceof Date ? rest.visitedAt.toISOString() : rest.visitedAt,
    createdAt: rest.createdAt instanceof Date ? rest.createdAt.toISOString() : rest.createdAt,
    updatedAt: rest.updatedAt instanceof Date ? rest.updatedAt.toISOString() : rest.updatedAt,
    isLiked: userId ? Array.isArray(likes) && likes.length > 0 : undefined,
    isWishlisted: userId ? Array.isArray(wishlists) && wishlists.length > 0 : undefined,
    isVisited: userId ? Array.isArray(visited) && visited.length > 0 : undefined,
  };
}
