import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/stats.repository", () => ({
  findAllPostsByUser: vi.fn(),
  findYearlyPosts: vi.fn(),
  findYearlyCompletedPlans: vi.fn(),
  findAllPostsGroupedByYear: vi.fn(),
}));

import {
  findAllPostsByUser,
  findYearlyPosts,
  findYearlyCompletedPlans,
  findAllPostsGroupedByYear,
} from "@/lib/repositories/stats.repository";
import { getAvailableYearsService, getYearlyStatsService, getTimelineService } from "@/lib/services/stats.service";

const USER_ID = "user-1";

describe("getAvailableYearsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("重複年は排除し降順で返す", async () => {
    vi.mocked(findAllPostsByUser).mockResolvedValue([
      { visitedAt: new Date("2025-05-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-01-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-06-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
    ] as never);

    const years = await getAvailableYearsService(USER_ID);

    expect(years).toEqual([2026, 2025]);
  });

  it("投稿が0件_空配列(境界値)", async () => {
    vi.mocked(findAllPostsByUser).mockResolvedValue([]);

    expect(await getAvailableYearsService(USER_ID)).toEqual([]);
  });
});

describe("getYearlyStatsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cost未設定は0扱いで合計される", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      { visitedAt: new Date("2026-01-15"), location: "東京都", category: "観光", cost: null, _count: { images: 1 } },
      { visitedAt: new Date("2026-02-15"), location: "大阪府", category: "グルメ", cost: 5000, _count: { images: 2 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(2);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.totalCost).toBe(5000);
    expect(result.totalPosts).toBe(2);
    expect(result.totalPhotos).toBe(3);
    expect(result.completedPlans).toBe(2);
  });

  it("locationが同数の場合は最初に出現したものをtopLocationとする", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      { visitedAt: new Date("2026-01-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-02-01"), location: "大阪府", category: "観光", cost: null, _count: { images: 0 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.topLocation).toBe("東京都");
    expect(result.visitedLocations).toEqual(["東京都", "大阪府"]);
  });

  it("visitedLocationsは訪問日順ではなく北海道→沖縄県の地理順で並ぶ", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      // 訪問日は沖縄県が先、北海道が後だが、表示順は地理順（北海道→沖縄県）になるべき
      { visitedAt: new Date("2026-01-01"), location: "沖縄県", category: "観光", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-02-01"), location: "北海道", category: "観光", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-03-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.visitedLocations).toEqual(["北海道", "東京都", "沖縄県"]);
  });

  it("投稿が0件_topLocationはnullでvisitedLocationsは空配列(境界値)", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([]);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.topLocation).toBeNull();
    expect(result.visitedLocations).toEqual([]);
    expect(result.totalPosts).toBe(0);
  });

  it("monthlyPostCountは1〜12月全てを含む（投稿のない月は0）", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      { visitedAt: new Date("2026-03-10"), location: "東京都", category: "観光", cost: 1000, _count: { images: 0 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.monthlyPostCount).toHaveLength(12);
    expect(result.monthlyPostCount.find((m) => m.month === 3)?.count).toBe(1);
    expect(result.monthlyPostCount.find((m) => m.month === 1)?.count).toBe(0);
  });

  it("categoryBreakdownは件数降順、同数の場合はCATEGORIES定義順で並ぶ", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      // 投稿の出現順は「レジャー」が先だが、CATEGORIES定義順では「グルメ」の方が先
      { visitedAt: new Date("2026-01-01"), location: "東京都", category: "レジャー", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-02-01"), location: "東京都", category: "グルメ", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-03-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-04-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.categoryBreakdown).toEqual([
      { category: "観光", count: 2 },
      { category: "グルメ", count: 1 },
      { category: "レジャー", count: 1 },
    ]);
  });

  it("categoryが未設定の投稿は集計から除外される", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      { visitedAt: new Date("2026-01-01"), location: "東京都", category: null, cost: null, _count: { images: 0 } },
      { visitedAt: new Date("2026-02-01"), location: "東京都", category: "観光", cost: null, _count: { images: 0 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.categoryBreakdown).toEqual([{ category: "観光", count: 1 }]);
  });

  it("year=null（全期間）_yearはallになりyearlyPostCountが年ごとに集計されmonthlyPostCountは空", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      { visitedAt: new Date("2025-03-10"), location: "東京都", category: "観光", cost: 1000, _count: { images: 0 } },
      { visitedAt: new Date("2025-08-01"), location: "大阪府", category: "グルメ", cost: 2000, _count: { images: 0 } },
      { visitedAt: new Date("2026-01-01"), location: "東京都", category: "観光", cost: 500, _count: { images: 0 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(1);

    const result = await getYearlyStatsService(USER_ID, null);

    expect(result.year).toBe("all");
    expect(result.monthlyPostCount).toEqual([]);
    expect(result.yearlyPostCount).toEqual([
      { year: 2025, count: 2 },
      { year: 2026, count: 1 },
    ]);
  });

  it("year=null（全期間）_findYearlyPosts/findYearlyCompletedPlansにnullが渡される", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([]);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    await getYearlyStatsService(USER_ID, null);

    expect(findYearlyPosts).toHaveBeenCalledWith(USER_ID, null);
    expect(findYearlyCompletedPlans).toHaveBeenCalledWith(USER_ID, null);
  });

  it("year指定時はyearlyPostCountが空でmonthlyPostCountが計算される", async () => {
    vi.mocked(findYearlyPosts).mockResolvedValue([
      { visitedAt: new Date("2026-03-10"), location: "東京都", category: "観光", cost: 1000, _count: { images: 0 } },
    ] as never);
    vi.mocked(findYearlyCompletedPlans).mockResolvedValue(0);

    const result = await getYearlyStatsService(USER_ID, 2026);

    expect(result.yearlyPostCount).toEqual([]);
    expect(result.monthlyPostCount).toHaveLength(12);
  });
});

describe("getTimelineService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("年ごとにグルーピングされ降順で返る", async () => {
    vi.mocked(findAllPostsGroupedByYear).mockResolvedValue([
      { id: "p1", title: "投稿1", location: "東京都", visitedAt: "2026-06-01T00:00:00.000Z", images: [] },
      { id: "p2", title: "投稿2", location: "大阪府", visitedAt: "2025-06-01T00:00:00.000Z", images: [] },
    ] as never);

    const result = await getTimelineService(USER_ID);

    expect(result).toEqual([
      { year: 2026, posts: [{ id: "p1", title: "投稿1", location: "東京都", visitedAt: "2026-06-01T00:00:00.000Z", images: [] }] },
      { year: 2025, posts: [{ id: "p2", title: "投稿2", location: "大阪府", visitedAt: "2025-06-01T00:00:00.000Z", images: [] }] },
    ]);
  });
});
