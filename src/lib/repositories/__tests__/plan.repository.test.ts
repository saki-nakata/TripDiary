import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  findPlansByUserId,
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
});
