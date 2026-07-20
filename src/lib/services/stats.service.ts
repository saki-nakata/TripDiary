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

  // 評価の分布。★1〜5それぞれの件数（評価なしの投稿は除外）。平均評価カードの算出に使う
  const ratingCounts = new Map<number, number>();
  for (let r = 1; r <= 5; r++) ratingCounts.set(r, 0);
  for (const p of posts) {
    if (p.rating == null || p.rating < 1 || p.rating > 5) continue;
    ratingCounts.set(p.rating, (ratingCounts.get(p.rating) ?? 0) + 1);
  }
  const ratingBreakdown = Array.from(ratingCounts.entries()).map(([rating, count]) => ({ rating, count }));
  const ratedCount = ratingBreakdown.reduce((sum, r) => sum + r.count, 0);
  const averageRating =
    ratedCount > 0 ? ratingBreakdown.reduce((sum, r) => sum + r.rating * r.count, 0) / ratedCount : null;

  // 高評価スポットTOP3。同点は訪問日が新しい方を優先（findYearlyPostsはvisitedAt昇順のため配列の後ろほど新しい）
  const topRatedPosts = posts
    .map((p, index) => ({ ...p, index }))
    .filter((p) => p.rating != null)
    .sort((a, b) => b.rating! - a.rating! || b.index - a.index)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      title: p.title,
      location: p.location,
      category: p.category,
      visitedAt: p.visitedAt.toISOString(),
      rating: p.rating!,
      thumbnail: p.images[0]?.url ?? null,
    }));

  const locatedPosts = posts.filter((p) => p.location);
  // 北海道→沖縄県（→海外）の順（LOCATIONS配列の並び順＝都道府県塗り分け地図と同じ基準）で表示する
  const visitedLocations = Array.from(new Set(locatedPosts.map((p) => p.location))).sort(
    (a, b) => LOCATION_ORDER.indexOf(a) - LOCATION_ORDER.indexOf(b)
  );

  const locationCounts = new Map<string, number>();
  for (const p of locatedPosts) {
    locationCounts.set(p.location, (locationCounts.get(p.location) ?? 0) + 1);
  }
  // バブルチャート用。件数降順、同数の場合は都道府県順（表示順を安定させる）
  const locationBreakdown = Array.from(locationCounts.entries())
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count || LOCATION_ORDER.indexOf(a.location) - LOCATION_ORDER.indexOf(b.location));
  // 「最多訪問エリア」カードは一番大きいバブルと必ず同じエリアになるよう、locationBreakdown先頭から導出する
  // （タイブレーク基準がずれると、同数タイのときカードとバブルで異なる県を指してしまうため）
  const topLocation = locationBreakdown[0]?.location ?? null;

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

  // 単年ヒートマップ（当年の月別投稿数）用
  let monthlyPostCount: { month: number; count: number }[] = [];
  // 全期間の折れ線（年別投稿数の推移）用
  let yearlyPostCount: { year: number; count: number }[] = [];
  // 全期間ヒートマップ（年をまたいだ月別＝季節性の投稿数）用。年別折れ線とは軸が異なるため重複しない
  let seasonalPostCount: { month: number; count: number }[] = [];

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

    // 季節性ヒートマップ用。年をまたいで「その月（1〜12月）」に何件旅したかを通算する
    const seasonalCountMap = new Map<number, number>();
    for (let month = 1; month <= 12; month++) seasonalCountMap.set(month, 0);
    for (const p of posts) {
      const month = p.visitedAt.getMonth() + 1;
      seasonalCountMap.set(month, (seasonalCountMap.get(month) ?? 0) + 1);
    }
    seasonalPostCount = Array.from(seasonalCountMap.entries()).map(([month, count]) => ({ month, count }));
  }

  return {
    year: year ?? ("all" as const),
    completedPlans,
    totalPosts,
    totalPhotos,
    totalCost,
    visitedLocations,
    topLocation,
    locationBreakdown,
    categoryBreakdown,
    ratingBreakdown,
    averageRating,
    topRatedPosts,
    monthlyPostCount,
    yearlyPostCount,
    seasonalPostCount,
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
