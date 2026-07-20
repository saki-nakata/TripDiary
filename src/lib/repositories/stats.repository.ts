import { prisma } from "@/lib/prisma";

const STATS_POST_SELECT = {
  id: true,
  title: true,
  visitedAt: true,
  location: true,
  category: true,
  cost: true,
  rating: true,
  images: { take: 1, orderBy: { displayOrder: "asc" as const }, select: { url: true } },
  _count: { select: { images: true } },
} as const;

const TIMELINE_POST_SELECT = {
  id: true,
  title: true,
  location: true,
  category: true,
  visitedAt: true,
  images: { take: 1, orderBy: { displayOrder: "asc" as const }, select: { url: true } },
} as const;

export async function findAllPostsByUser(userId: string) {
  return prisma.post.findMany({
    where: { authorId: userId },
    select: STATS_POST_SELECT,
  });
}

export async function findYearlyPosts(userId: string, year: number | null) {
  const dateFilter =
    year != null
      ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
      : undefined;
  return prisma.post.findMany({
    where: { authorId: userId, ...(dateFilter ? { visitedAt: dateFilter } : {}) },
    orderBy: { visitedAt: "asc" },
    select: STATS_POST_SELECT,
  });
}

export async function findYearlyCompletedPlans(userId: string, year: number | null) {
  if (year == null) {
    return prisma.plan.count({ where: { userId, completed: true } });
  }
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  // startDate が null のプランは gte/lt 比較が false になり自動的に除外される
  return prisma.plan.count({
    where: { userId, completed: true, startDate: { gte: start, lt: end } },
  });
}

export async function findAllPostsGroupedByYear(userId: string) {
  const posts = await prisma.post.findMany({
    where: { authorId: userId },
    orderBy: { visitedAt: "desc" },
    select: TIMELINE_POST_SELECT,
  });
  return posts.map((p) => ({ ...p, visitedAt: p.visitedAt.toISOString() }));
}
