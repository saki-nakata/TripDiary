import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withDeadlockRetry } from "@/lib/prisma-retry";

async function lockUsers(tx: Prisma.TransactionClient, userIds: string[]) {
  for (const userId of [...new Set(userIds)].sort()) {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
  }
}

export async function toggleFollow(followerId: string, followingId: string) {
  // Followの作成前に、関係する2つのUser行をID順で排他ロックする。順序を固定しないと
  // A→BとB→Aの同時操作が互いに別のUser行を待つデッドロック経路になる。
  return withDeadlockRetry(() =>
    prisma.$transaction(async (tx) => {
      await lockUsers(tx, [followerId, followingId]);
      const { count } = await tx.follow.deleteMany({ where: { followerId, followingId } });
      if (count > 0) {
        // deleteMany・カウンタ更新を同一トランザクションにまとめ、片方だけ失敗する不整合を防ぐ
        await Promise.all([
          tx.user.update({ where: { id: followerId }, data: { followingCount: { decrement: 1 } } }),
          tx.user.update({ where: { id: followingId }, data: { followerCount: { decrement: 1 } } }),
        ]);
        return { following: false };
      }

      try {
        await tx.follow.create({ data: { followerId, followingId } });
        await Promise.all([
          tx.user.update({ where: { id: followerId }, data: { followingCount: { increment: 1 } } }),
          tx.user.update({ where: { id: followingId }, data: { followerCount: { increment: 1 } } }),
        ]);
        return { following: true };
      } catch (e) {
        // 同時に別リクエストが先にcreateしていた場合（P2002: 一意制約違反）は、
        // そちらのトランザクションで既にカウンタも加算済みのため、ここでは何もせず成功扱いにする
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          return { following: true };
        }
        throw e;
      }
    })
  );
}

export async function isFollowing(followerId: string, followingId: string) {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  return !!existing;
}

export async function findFollowingIdsAmong(viewerId: string, userIds: string[]) {
  if (userIds.length === 0) return [];
  const rows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: userIds } },
    select: { followingId: true },
  });
  return rows.map((r) => r.followingId);
}

const FOLLOW_USER_SELECT = {
  id: true,
  nickname: true,
  image: true,
  bio: true,
} as const;

export async function findFollowers({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const rows = await prisma.follow.findMany({
    where: { followingId: userId },
    take: limit + 1,
    ...(cursor && { cursor: { followerId_followingId: { followerId: cursor, followingId: userId } }, skip: 1 }),
    orderBy: [{ createdAt: "desc" }, { followerId: "desc" }], // followerIdタイブレーカーで全順序を保証（GATE-22種類B）
    select: { followerId: true, follower: { select: FOLLOW_USER_SELECT } },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    users: items.map((r) => r.follower),
    nextCursor: hasMore ? items[items.length - 1].followerId : null,
    hasMore,
  };
}

export async function findFollowing({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    take: limit + 1,
    ...(cursor && { cursor: { followerId_followingId: { followerId: userId, followingId: cursor } }, skip: 1 }),
    orderBy: [{ createdAt: "desc" }, { followingId: "desc" }], // followingIdタイブレーカーで全順序を保証（GATE-22種類B）
    select: { followingId: true, following: { select: FOLLOW_USER_SELECT } },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    users: items.map((r) => r.following),
    nextCursor: hasMore ? items[items.length - 1].followingId : null,
    hasMore,
  };
}
