import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function toggleFollow(followerId: string, followingId: string) {
  const { count } = await prisma.follow.deleteMany({ where: { followerId, followingId } });
  if (count > 0) return { following: false };

  try {
    await prisma.follow.create({ data: { followerId, followingId } });
    return { following: true };
  } catch (e) {
    // 同時に別リクエストが先にcreateしていた場合（P2002: 一意制約違反）は、結果的にフォロー済みなので成功扱いにする
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { following: true };
    }
    throw e;
  }
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

export async function countFollowers(userId: string) {
  return prisma.follow.count({ where: { followingId: userId } });
}

export async function countFollowing(userId: string) {
  return prisma.follow.count({ where: { followerId: userId } });
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
