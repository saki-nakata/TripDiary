import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function toggleFollow(followerId: string, followingId: string) {
  return prisma.$transaction(async (tx) => {
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
  });
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

export async function findFollowers(userId: string) {
  const rows = await prisma.follow.findMany({
    where: { followingId: userId },
    orderBy: { createdAt: "desc" },
    select: { follower: { select: FOLLOW_USER_SELECT } },
  });
  return rows.map((r) => r.follower);
}

export async function findFollowing(userId: string) {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: "desc" },
    select: { following: { select: FOLLOW_USER_SELECT } },
  });
  return rows.map((r) => r.following);
}
