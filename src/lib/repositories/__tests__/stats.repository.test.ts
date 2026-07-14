import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  findAllPostsByUser,
  findYearlyPosts,
  findYearlyCompletedPlans,
  findAllPostsGroupedByYear,
} from "@/lib/repositories/stats.repository";
import { createPost } from "@/lib/repositories/post.repository";
import { createPlan, setPlanCompleted } from "@/lib/repositories/plan.repository";

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.planSpot.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.postImage.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("stats.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── findAllPostsByUser ───
  it("findAllPostsByUser_他人の投稿は含まれない", async () => {
    const me = await createTestUser("stats-me1@example.com", "自分1");
    const other = await createTestUser("stats-other1@example.com", "他人1");
    await createPost(me.id, { title: "自分の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(other.id, { title: "他人の投稿", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-02" });

    const result = await findAllPostsByUser(me.id);

    expect(result).toHaveLength(1);
  });

  // ─── findYearlyPosts ───
  it("findYearlyPosts_指定年の投稿のみ取得される", async () => {
    const me = await createTestUser("stats-me2@example.com", "自分2");
    await createPost(me.id, { title: "2025年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2025-12-31" });
    await createPost(me.id, { title: "2026年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await findYearlyPosts(me.id, 2026);

    expect(result).toHaveLength(1);
    expect(result[0].location).toBe("東京都");
  });

  it("findYearlyPosts_年境界（12/31と1/1）が正しく分離される(境界値)", async () => {
    const me = await createTestUser("stats-me3@example.com", "自分3");
    await createPost(me.id, { title: "年末投稿", body: "本文", location: "北海道", category: "季節・イベント", visitedAt: "2025-12-31" });
    await createPost(me.id, { title: "年始投稿", body: "本文", location: "沖縄県", category: "季節・イベント", visitedAt: "2026-01-01" });

    const result2025 = await findYearlyPosts(me.id, 2025);
    const result2026 = await findYearlyPosts(me.id, 2026);

    expect(result2025).toHaveLength(1);
    expect(result2026).toHaveLength(1);
  });

  it("findYearlyPosts_yearがnull（全期間）の場合は全年の投稿を取得する", async () => {
    const me = await createTestUser("stats-me3b@example.com", "自分3b");
    await createPost(me.id, { title: "2025年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2025-06-01" });
    await createPost(me.id, { title: "2026年の投稿", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-06-01" });

    const result = await findYearlyPosts(me.id, null);

    expect(result).toHaveLength(2);
  });

  // ─── findYearlyCompletedPlans ───
  it("findYearlyCompletedPlans_startDate未設定のプランは除外される", async () => {
    const me = await createTestUser("stats-me4@example.com", "自分4");
    const planWithDate = await createPlan(me.id, { title: "日程ありプラン", startDate: "2026-05-01", budget: null });
    await setPlanCompleted(planWithDate.id, true);
    const planWithoutDate = await createPlan(me.id, { title: "日程なしプラン", budget: null });
    await setPlanCompleted(planWithoutDate.id, true);

    const count = await findYearlyCompletedPlans(me.id, 2026);

    expect(count).toBe(1);
  });

  it("findYearlyCompletedPlans_未完了のプランは除外される", async () => {
    const me = await createTestUser("stats-me5@example.com", "自分5");
    await createPlan(me.id, { title: "未完了プラン", startDate: "2026-05-01", budget: null });

    const count = await findYearlyCompletedPlans(me.id, 2026);

    expect(count).toBe(0);
  });

  it("findYearlyCompletedPlans_yearがnull（全期間）の場合は日程未設定のプランも含めて全て数える", async () => {
    const me = await createTestUser("stats-me5b@example.com", "自分5b");
    const planWithDate = await createPlan(me.id, { title: "日程ありプラン", startDate: "2025-05-01", budget: null });
    await setPlanCompleted(planWithDate.id, true);
    const planWithoutDate = await createPlan(me.id, { title: "日程なしプラン", budget: null });
    await setPlanCompleted(planWithoutDate.id, true);
    await createPlan(me.id, { title: "未完了プラン", startDate: "2026-05-01", budget: null });

    const count = await findYearlyCompletedPlans(me.id, null);

    expect(count).toBe(2);
  });

  // ─── findAllPostsGroupedByYear ───
  it("findAllPostsGroupedByYear_visitedAt降順で取得される", async () => {
    const me = await createTestUser("stats-me6@example.com", "自分6");
    await createPost(me.id, { title: "古い投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2025-01-01" });
    await createPost(me.id, { title: "新しい投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await findAllPostsGroupedByYear(me.id);

    expect(result[0].title).toBe("新しい投稿");
    expect(result[1].title).toBe("古い投稿");
  });
});
