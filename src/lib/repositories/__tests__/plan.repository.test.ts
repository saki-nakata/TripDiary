import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  findPlansByUserId,
  findActivePlansByUserId,
  findCompletedPlansByUserId,
  findCompletedPlanYears,
  countCompletedPlansByUserId,
  findPlanById,
  findPlanAuthorId,
  findPlanAuthorAndCompleted,
  createPlan,
  updatePlan,
  deletePlan,
  setPlanCompleted,
  findExistingPostIds,
  countActivePlansByUser,
} from "@/lib/repositories/plan.repository";
import { createPost } from "@/lib/repositories/post.repository";

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

const basePlanInput = {
  title: "テストプラン",
  budget: null as number | null,
};

describe("plan.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── createPlan ───
  it("createPlan_spots(post)指定_planSpotsがdisplayOrder順で作成される", async () => {
    const me = await createTestUser("plan-me1@example.com", "自分1");
    const post1 = await createPost(me.id, { title: "スポットA", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const post2 = await createPost(me.id, { title: "スポットB", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-02" });

    const plan = await createPlan(me.id, {
      ...basePlanInput,
      spots: [{ type: "post", postId: post1.id }, { type: "post", postId: post2.id }],
    });
    const detail = await findPlanById(plan.id);

    expect(detail?.spots).toHaveLength(2);
    expect(detail?.spots[0].post?.id).toBe(post1.id);
    expect(detail?.spots[1].post?.id).toBe(post2.id);
  });

  it("findPlanById_スポットのpostに他ユーザー作成分も含めauthorIdが返る", async () => {
    const me = await createTestUser("plan-me1c@example.com", "自分1c");
    const other = await createTestUser("plan-other1c@example.com", "他ユーザー1c");
    const otherPost = await createPost(other.id, { title: "他人のスポット", body: "本文", location: "京都府", category: "観光", visitedAt: "2026-01-03" });

    const plan = await createPlan(me.id, {
      ...basePlanInput,
      spots: [{ type: "post", postId: otherPost.id }],
    });
    const detail = await findPlanById(plan.id);

    expect(detail?.spots[0].post?.authorId).toBe(other.id);
  });

  it("createPlan_spots(free)指定_freeTitle等がplanSpotsに保存される", async () => {
    const me = await createTestUser("plan-me1b@example.com", "自分1b");

    const plan = await createPlan(me.id, {
      ...basePlanInput,
      spots: [{ type: "free", title: "自由入力スポット", location: "東京都", category: "観光" }],
    });
    const detail = await findPlanById(plan.id);

    expect(detail?.spots).toHaveLength(1);
    expect(detail?.spots[0].post).toBeNull();
    expect(detail?.spots[0].freeTitle).toBe("自由入力スポット");
    expect(detail?.spots[0].freeLocation).toBe("東京都");
    expect(detail?.spots[0].freeCategory).toBe("観光");
  });

  it("createPlan_spots未指定_プランのみ作成される", async () => {
    const me = await createTestUser("plan-me2@example.com", "自分2");

    const plan = await createPlan(me.id, basePlanInput);
    const detail = await findPlanById(plan.id);

    expect(detail?.spots).toHaveLength(0);
  });

  // ─── findPlansByUserId ───
  it("findPlansByUserId_他人のプランは含まれない", async () => {
    const me = await createTestUser("plan-me3@example.com", "自分3");
    const other = await createTestUser("plan-other3@example.com", "他人3");
    await createPlan(me.id, basePlanInput);
    await createPlan(other.id, basePlanInput);

    const plans = await findPlansByUserId(me.id);

    expect(plans).toHaveLength(1);
    expect(plans[0].userId).toBe(me.id);
  });

  // ─── updatePlan ───
  it("updatePlan_spotsを差し替え_古いplanSpotsは削除され新しいものだけ残る", async () => {
    const me = await createTestUser("plan-me4@example.com", "自分4");
    const post1 = await createPost(me.id, { title: "スポットA", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const post2 = await createPost(me.id, { title: "スポットB", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-02" });
    const plan = await createPlan(me.id, { ...basePlanInput, spots: [{ type: "post", postId: post1.id }] });

    await updatePlan(plan.id, { ...basePlanInput, spots: [{ type: "post", postId: post2.id }] });
    const detail = await findPlanById(plan.id);

    expect(detail?.spots).toHaveLength(1);
    expect(detail?.spots[0].post?.id).toBe(post2.id);
  });

  it("updatePlan_spots未指定_既存のplanSpotsは変更されない", async () => {
    const me = await createTestUser("plan-me5@example.com", "自分5");
    const post1 = await createPost(me.id, { title: "スポットA", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const plan = await createPlan(me.id, { ...basePlanInput, spots: [{ type: "post", postId: post1.id }] });

    await updatePlan(plan.id, { ...basePlanInput, title: "更新後タイトル" });
    const detail = await findPlanById(plan.id);

    expect(detail?.title).toBe("更新後タイトル");
    expect(detail?.spots).toHaveLength(1);
  });

  // ─── deletePlan ───
  it("deletePlan_削除後はfindPlanByIdでnull", async () => {
    const me = await createTestUser("plan-me6@example.com", "自分6");
    const plan = await createPlan(me.id, basePlanInput);

    await deletePlan(plan.id);

    expect(await findPlanById(plan.id)).toBeNull();
  });

  it("deletePlan_プランのみ削除されリンク済み投稿は残る（planIdがnullになる）", async () => {
    const me = await createTestUser("plan-me7@example.com", "自分7");
    const plan = await createPlan(me.id, basePlanInput);
    const post = await createPost(me.id, {
      title: "記録した投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01", planId: plan.id,
    });

    await deletePlan(plan.id);
    const remaining = await prisma.post.findUnique({ where: { id: post.id } });

    expect(remaining).not.toBeNull();
    expect(remaining?.planId).toBeNull();
  });

  // ─── setPlanCompleted ───
  it("setPlanCompleted_true指定_completedがtrueになる", async () => {
    const me = await createTestUser("plan-me8@example.com", "自分8");
    const plan = await createPlan(me.id, basePlanInput);

    const updated = await setPlanCompleted(plan.id, true);

    expect(updated.completed).toBe(true);
  });

  // ─── findPlanAuthorId ───
  it("findPlanAuthorId_存在するプラン_userIdを返す", async () => {
    const me = await createTestUser("plan-me11@example.com", "自分11");
    const plan = await createPlan(me.id, basePlanInput);

    expect(await findPlanAuthorId(plan.id)).toBe(me.id);
  });

  it("findPlanAuthorId_存在しないプラン_nullを返す", async () => {
    expect(await findPlanAuthorId("not-exist-id")).toBeNull();
  });

  // ─── findPlanAuthorAndCompleted ───
  it("findPlanAuthorAndCompleted_存在するプラン_userIdとcompletedを1クエリで返す", async () => {
    const me = await createTestUser("plan-me12@example.com", "自分12");
    const plan = await createPlan(me.id, basePlanInput);
    await setPlanCompleted(plan.id, true);

    expect(await findPlanAuthorAndCompleted(plan.id)).toEqual({ userId: me.id, completed: true });
  });

  it("findPlanAuthorAndCompleted_存在しないプラン_nullを返す", async () => {
    expect(await findPlanAuthorAndCompleted("not-exist-id")).toBeNull();
  });

  // ─── findExistingPostIds ───
  it("findExistingPostIds_一部存在しないID_存在するものだけ返す", async () => {
    const me = await createTestUser("plan-me9@example.com", "自分9");
    const post = await createPost(me.id, { title: "存在する投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await findExistingPostIds([post.id, "not-exist-id"]);

    expect(result).toEqual([post.id]);
  });

  it("findExistingPostIds_空配列_空配列を返す(境界値)", async () => {
    expect(await findExistingPostIds([])).toEqual([]);
  });

  // ─── countActivePlansByUser ───
  it("countActivePlansByUser_完了済みは除外してカウントされる", async () => {
    const me = await createTestUser("plan-me10@example.com", "自分10");
    const activePlan = await createPlan(me.id, basePlanInput);
    const completedPlan = await createPlan(me.id, basePlanInput);
    await setPlanCompleted(completedPlan.id, true);
    void activePlan;

    expect(await countActivePlansByUser(me.id)).toBe(1);
  });

  // ─── findActivePlansByUserId（GATE-22種類B: cursorページング） ───
  it("findActivePlansByUserId_完了済みは含まれない", async () => {
    const me = await createTestUser("plan-active1@example.com", "自分active1");
    const active = await createPlan(me.id, basePlanInput);
    const completed = await createPlan(me.id, basePlanInput);
    await setPlanCompleted(completed.id, true);

    const result = await findActivePlansByUserId({ userId: me.id });

    expect(result.plans.map((p) => p.id)).toEqual([active.id]);
    expect(result.hasMore).toBe(false);
  });

  it("findActivePlansByUserId_51件目以降もcursorで継続取得できる", async () => {
    const me = await createTestUser("plan-active2@example.com", "自分active2");
    for (let i = 0; i < 51; i++) {
      await createPlan(me.id, { ...basePlanInput, title: `プラン${i}` });
    }

    const page1 = await findActivePlansByUserId({ userId: me.id, limit: 50 });
    expect(page1.plans).toHaveLength(50);
    expect(page1.hasMore).toBe(true);

    const page2 = await findActivePlansByUserId({ userId: me.id, limit: 50, cursor: page1.nextCursor! });
    expect(page2.plans).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = new Set([...page1.plans, ...page2.plans].map((p) => p.id));
    expect(allIds.size).toBe(51);
  });

  it("findActivePlansByUserId_startDateが同一の進行中プラン群_idタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("plan-active-tie@example.com", "自分active-tie");
    const p1 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-05-01" });
    const p2 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-05-01" });
    const p3 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-05-01" });

    const page1 = await findActivePlansByUserId({ userId: me.id, limit: 2 });
    expect(page1.plans).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findActivePlansByUserId({ userId: me.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.plans).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.plans, ...page2.plans].map((p) => p.id).sort();
    expect(allIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  // ─── findCompletedPlansByUserId / findCompletedPlanYears / countCompletedPlansByUserId（GATE-22種類B） ───
  it("findCompletedPlansByUserId_yearを指定するとstartDateがその年の完了済みプランのみ取得される", async () => {
    const me = await createTestUser("plan-completed1@example.com", "自分completed1");
    const plan2025 = await createPlan(me.id, { ...basePlanInput, startDate: "2025-12-31" });
    const plan2026 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-01-01" });
    await setPlanCompleted(plan2025.id, true);
    await setPlanCompleted(plan2026.id, true);

    const result = await findCompletedPlansByUserId({ userId: me.id, year: 2026 });

    expect(result.plans.map((p) => p.id)).toEqual([plan2026.id]);
  });

  it("findCompletedPlansByUserId_yearを指定しない場合startDate未設定の完了済みプランも含め全件取得される(境界値)", async () => {
    const me = await createTestUser("plan-completed2@example.com", "自分completed2");
    const planWithDate = await createPlan(me.id, { ...basePlanInput, startDate: "2026-01-01" });
    const planWithoutDate = await createPlan(me.id, basePlanInput);
    await setPlanCompleted(planWithDate.id, true);
    await setPlanCompleted(planWithoutDate.id, true);

    const result = await findCompletedPlansByUserId({ userId: me.id });

    expect(result.plans.map((p) => p.id).sort()).toEqual([planWithDate.id, planWithoutDate.id].sort());
  });

  it("findCompletedPlansByUserId_startDateが同一の完了済みプラン群_idタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("plan-completed-tie@example.com", "自分completed-tie");
    const p1 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-05-01" });
    const p2 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-05-01" });
    const p3 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-05-01" });
    await Promise.all([p1, p2, p3].map((p) => setPlanCompleted(p.id, true)));

    const page1 = await findCompletedPlansByUserId({ userId: me.id, limit: 2 });
    expect(page1.plans).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findCompletedPlansByUserId({ userId: me.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.plans).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.plans, ...page2.plans].map((p) => p.id).sort();
    expect(allIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it("findCompletedPlanYears_startDate未設定の完了済みプランは対象外で、年の降順に返る(境界値)", async () => {
    const me = await createTestUser("plan-years1@example.com", "自分years1");
    const plan2024 = await createPlan(me.id, { ...basePlanInput, startDate: "2024-06-01" });
    const plan2026 = await createPlan(me.id, { ...basePlanInput, startDate: "2026-01-01" });
    const planWithoutDate = await createPlan(me.id, basePlanInput);
    await Promise.all([plan2024, plan2026, planWithoutDate].map((p) => setPlanCompleted(p.id, true)));

    expect(await findCompletedPlanYears(me.id)).toEqual([2026, 2024]);
  });

  it("findCompletedPlanYears_完了済みプランがない場合は空配列を返す(境界値)", async () => {
    const me = await createTestUser("plan-years2@example.com", "自分years2");

    expect(await findCompletedPlanYears(me.id)).toEqual([]);
  });

  it("countCompletedPlansByUserId_yearを指定した場合その年のみカウントされる", async () => {
    const me = await createTestUser("plan-count1@example.com", "自分count1");
    const plan2025 = await createPlan(me.id, { ...basePlanInput, startDate: "2025-12-31" });
    const plan2026a = await createPlan(me.id, { ...basePlanInput, startDate: "2026-01-01" });
    const plan2026b = await createPlan(me.id, { ...basePlanInput, startDate: "2026-06-01" });
    await Promise.all([plan2025, plan2026a, plan2026b].map((p) => setPlanCompleted(p.id, true)));

    expect(await countCompletedPlansByUserId(me.id, 2026)).toBe(2);
    expect(await countCompletedPlansByUserId(me.id)).toBe(3);
  });
});
