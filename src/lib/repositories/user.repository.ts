import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/errors";

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function deleteUserByEmailForTest(email: string) {
  return prisma.user.deleteMany({ where: { email } });
}

export async function createUser(data: { nickname: string; email: string; password: string }) {
  return prisma.user.create({
    data,
    select: { id: true, nickname: true, email: true },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nickname: true,
      image: true,
      bio: true,
      followerCount: true,
      followingCount: true,
      updatedAt: true,
      version: true,
    },
  });
}

export async function updateUser(
  id: string,
  data: { nickname: string; bio?: string | null; image?: string | null },
  expectedVersion: number
) {
  const { count } = await prisma.user.updateMany({
    // updatedAtはfollow等の非正規化カウンタ更新でも進むため競合検知に使えない（GATE-04）
    where: { id, version: expectedVersion },
    data: { ...data, version: { increment: 1 } },
  });
  if (count !== 1) throw new ConflictError("他の画面で更新されています。再読み込みしてください。");
  return prisma.user.findUniqueOrThrow({ where: { id }, select: { id: true, nickname: true, bio: true, image: true } });
}

export async function findUserPasswordHash(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { password: true, isProtected: true } });
  if (!user?.password) return null;
  return { password: user.password, isProtected: user.isProtected };
}

export async function updateUserPassword(id: string, hashedPassword: string) {
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
}

export async function findUserPasswordHashAndEmail(id: string) {
  return prisma.user.findUnique({ where: { id }, select: { password: true, email: true, isProtected: true } });
}

export async function updateUserEmail(id: string, email: string) {
  await prisma.user.update({ where: { id }, data: { email } });
}

export async function findUserThemePreference(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { themePreference: true } });
  return user?.themePreference ?? null;
}

// テーマ設定はプロフィール編集用のversion（楽観ロック、GATE-04）と無関係のため増やさない
export async function updateUserThemePreference(id: string, themePreference: "light" | "dark" | "system") {
  await prisma.user.update({ where: { id }, data: { themePreference } });
}

export async function countUserPosts(authorId: string, year?: number) {
  const dateFilter =
    year != null
      ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
      : undefined;
  return prisma.post.count({ where: { authorId, ...(dateFilter ? { visitedAt: dateFilter } : {}) } });
}

export async function countVisitedByUser(userId: string) {
  return prisma.visited.count({ where: { userId } });
}

export async function countLikesReceived(authorId: string) {
  const result = await prisma.post.aggregate({ where: { authorId }, _sum: { likeCount: true } });
  return result._sum.likeCount ?? 0;
}

export async function countCommentsReceived(authorId: string) {
  const result = await prisma.post.aggregate({ where: { authorId }, _sum: { commentCount: true } });
  return result._sum.commentCount ?? 0;
}

export type TabiScoreInputs = {
  postCount: number;
  visitedCount: number;
  likesReceived: number;
  commentsReceived: number;
};

export async function computeTabiScoreInputsForUsers(userIds: string[]): Promise<Map<string, TabiScoreInputs>> {
  const result = new Map<string, TabiScoreInputs>(
    userIds.map((id) => [id, { postCount: 0, visitedCount: 0, likesReceived: 0, commentsReceived: 0 }])
  );
  if (userIds.length === 0) return result;

  const [postCounts, visitedCounts, receivedCounts] = await Promise.all([
    prisma.post.groupBy({ by: ["authorId"], where: { authorId: { in: userIds } }, _count: { _all: true } }),
    prisma.visited.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _count: { _all: true } }),
    prisma.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: userIds } },
      _sum: { likeCount: true, commentCount: true },
    }),
  ]);

  for (const row of postCounts) {
    result.get(row.authorId)!.postCount = row._count._all;
  }
  for (const row of visitedCounts) {
    result.get(row.userId)!.visitedCount = row._count._all;
  }
  for (const row of receivedCounts) {
    const entry = result.get(row.authorId)!;
    entry.likesReceived = row._sum.likeCount ?? 0;
    entry.commentsReceived = row._sum.commentCount ?? 0;
  }

  return result;
}

const COMMENT_WITH_POST_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  postId: true,
  author: { select: { id: true, nickname: true, image: true } },
  post: {
    select: {
      id: true,
      title: true,
      images: { take: 1, orderBy: { displayOrder: "asc" }, select: { url: true } },
      author: { select: { id: true, nickname: true, image: true } },
    },
  },
} as const;

export async function countCommentsByAuthor(authorId: string) {
  return prisma.comment.count({ where: { authorId } });
}

export async function findCommentsByAuthor({
  authorId,
  cursor,
  limit = 20,
}: {
  authorId: string;
  cursor?: string;
  limit?: number;
}) {
  const comments = await prisma.comment.findMany({
    where: { authorId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], // idタイブレーカーで全順序を保証（GATE-22種類B）
    select: COMMENT_WITH_POST_SELECT,
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;
  return {
    comments: items.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

export async function findCommentsReceivedByAuthor({
  authorId,
  cursor,
  limit = 20,
}: {
  authorId: string;
  cursor?: string;
  limit?: number;
}) {
  const comments = await prisma.comment.findMany({
    where: { post: { authorId } },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], // idタイブレーカーで全順序を保証（GATE-22種類B）
    select: COMMENT_WITH_POST_SELECT,
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;
  return {
    comments: items.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

export async function searchUsersByNickname({
  q,
  cursor,
  limit = 20,
  excludeUserId,
}: {
  q: string;
  cursor?: string;
  limit?: number;
  excludeUserId?: string;
}) {
  const users = await prisma.user.findMany({
    where: {
      ...(q && { nickname: { contains: q } }),
      ...(excludeUserId && { id: { not: excludeUserId } }),
    },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { id: "asc" },
    select: {
      id: true,
      nickname: true,
      image: true,
      bio: true,
      followerCount: true,
      _count: { select: { posts: true } },
    },
  });

  const hasMore = users.length > limit;
  const items = hasMore ? users.slice(0, limit) : users;
  return {
    users: items.map(({ followerCount, _count, ...rest }) => ({
      ...rest,
      _count: { posts: _count.posts, followers: followerCount },
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}
