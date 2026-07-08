import { prisma } from "@/lib/prisma";

export async function toggleFollow(followerId: string, followingId: string) {
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { followerId_followingId: { followerId, followingId } } });
    return { following: false };
  }

  await prisma.follow.create({ data: { followerId, followingId } });
  return { following: true };
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
