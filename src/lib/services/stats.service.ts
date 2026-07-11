import {
  findAllPostsByUser,
  findYearlyPosts,
  findYearlyCompletedPlans,
  findAllPostsGroupedByYear,
} from "@/lib/repositories/stats.repository";

export async function getAvailableYearsService(userId: string) {
  const posts = await findAllPostsByUser(userId);
  const years = new Set(posts.map((p) => p.visitedAt.getFullYear()));
  return Array.from(years).sort((a, b) => b - a);
}

export async function getYearlyStatsService(userId: string, year: number | null) {
  const [posts, completedPlans] = await Promise.all([
    findYearlyPosts(userId, year),
    findYearlyCompletedPlans(userId, year),
  ]);

  const totalPosts = posts.length;
  const totalPhotos = posts.reduce((sum, p) => sum + p._count.images, 0);
  const totalCost = posts.reduce((sum, p) => sum + (p.cost ?? 0), 0);

  const locatedPosts = posts.filter((p) => p.location);
  const visitedLocations = Array.from(new Set(locatedPosts.map((p) => p.location)));

  const locationCounts = new Map<string, number>();
  for (const p of locatedPosts) {
    locationCounts.set(p.location, (locationCounts.get(p.location) ?? 0) + 1);
  }
  const maxLocationCount = Math.max(0, ...Array.from(locationCounts.values()));
  // 同数の場合は最初に出現した（visitedAt 昇順で最初の）ものを採用
  const topLocation = locatedPosts.find((p) => locationCounts.get(p.location) === maxLocationCount)?.location ?? null;

  const categoryCounts = new Map<string, number>();
  for (const p of posts) {
    if (!p.category) continue;
    categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
  }
  const categoryBreakdown = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  let monthlyPostCount: { month: number; count: number }[] = [];
  let yearlyPostCount: { year: number; count: number }[] = [];

  if (year != null) {
    const monthlyCountMap = new Map<number, number>();
    for (let month = 1; month <= 12; month++) monthlyCountMap.set(month, 0);
    for (const p of posts) {
      const month = p.visitedAt.getMonth() + 1;
      monthlyCountMap.set(month, (monthlyCountMap.get(month) ?? 0) + 1);
    }
    monthlyPostCount = Array.from(monthlyCountMap.entries()).map(([month, count]) => ({ month, count }));
  } else {
    const yearlyPostCountMap = new Map<number, number>();
    for (const p of posts) {
      const y = p.visitedAt.getFullYear();
      yearlyPostCountMap.set(y, (yearlyPostCountMap.get(y) ?? 0) + 1);
    }
    yearlyPostCount = Array.from(yearlyPostCountMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([y, count]) => ({ year: y, count }));
  }

  return {
    year: year ?? ("all" as const),
    completedPlans,
    totalPosts,
    totalPhotos,
    totalCost,
    visitedLocations,
    topLocation,
    categoryBreakdown,
    monthlyPostCount,
    yearlyPostCount,
  };
}

export async function getTimelineService(userId: string) {
  const posts = await findAllPostsGroupedByYear(userId);
  const grouped = new Map<number, typeof posts>();
  for (const post of posts) {
    const year = new Date(post.visitedAt).getFullYear();
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year)!.push(post);
  }
  return Array.from(grouped.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, posts: items }));
}
