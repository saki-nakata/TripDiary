import {
  findAllPostsByUser,
  findYearlyPosts,
  findYearlyCompletedPlans,
  findAllPostsGroupedByYear,
} from "@/lib/repositories/stats.repository";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";

const LOCATION_ORDER = LOCATIONS as readonly string[];
const CATEGORY_ORDER = CATEGORIES as readonly string[];

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
  // 北海道→沖縄県（→海外）の順（LOCATIONS配列の並び順＝都道府県塗り分け地図と同じ基準）で表示する
  const visitedLocations = Array.from(new Set(locatedPosts.map((p) => p.location))).sort(
    (a, b) => LOCATION_ORDER.indexOf(a) - LOCATION_ORDER.indexOf(b)
  );

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
  // 件数降順。同数の場合は CATEGORIES の定義順（投稿の取得順に依存させず表示順を安定させる）
  const categoryBreakdown = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort(
      (a, b) =>
        b.count - a.count || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    );

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
