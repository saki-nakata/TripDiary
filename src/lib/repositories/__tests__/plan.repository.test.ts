import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  findPlansByUserId,
  findPlanById,
  findPlanAuthorId,
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

  // ─── updatePlan（楽観ロック・completed統合） ───
  it("updatePlan_spotsを差し替え_古いplanSpotsは削除され新しいものだけ残る", async () => {
    const me = await createTestUser("plan-me4@example.com", "自分4");
    const post1 = await createPost(me.id, { title: "スポットA", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const post2 = await createPost(me.id, { title: "スポットB", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-02" });
    const plan = await createPlan(me.id, { ...basePlanInput, spots: [{ type: "post", postId: post1.id }] });

    await updatePlan(
      plan.id,
      { ...basePlanInput, completed: false, version: plan.version, spots: [{ type: "post", postId: post2.id }] },
      plan.version
    );
    const detail = await findPlanById(plan.id);

    expect(detail?.spots).toHaveLength(1);
    expect(detail?.spots[0].post?.id).toBe(post2.id);
  });

  it("updatePlan_spots未指定_既存のplanSpotsは変更されない", async () => {
    const me = await createTestUser("plan-me5@example.com", "自分5");
    const post1 = await createPost(me.id, { title: "スポットA", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const plan = await createPlan(me.id, { ...basePlanInput, spots: [{ type: "post", postId: post1.id }] });

    await updatePlan(plan.id, { ...basePlanInput, completed: false, version: plan.version, title: "更新後タイトル" }, plan.version);
    const detail = await findPlanById(plan.id);

    expect(detail?.title).toBe("更新後タイトル");
    expect(detail?.spots).toHaveLength(1);
  });

  it("updatePlan_completedをtrueに統合更新_completedが反映されversionがincrementされる（GATE-21）", async () => {
    const me = await createTestUser("plan-me4d@example.com", "自分4d");
    const plan = await createPlan(me.id, basePlanInput);

    const updated = await updatePlan(plan.id, { ...basePlanInput, completed: true, version: plan.version }, plan.version);

    expect(updated.completed).toBe(true);
    expect(updated.version).toBe(plan.version + 1);
  });

  it("updatePlan_versionが実際と異なる_失敗する（楽観ロック、GATE-05）", async () => {
    const me = await createTestUser("plan-me4e@example.com", "自分4e");
    const plan = await createPlan(me.id, basePlanInput);
    const staleVersion = plan.version + 1;

    await expect(
      updatePlan(plan.id, { ...basePlanInput, completed: false, version: staleVersion, title: "更新後" }, staleVersion)
    ).rejects.toThrow();

    const detail = await findPlanById(plan.id);
    expect(detail?.title).toBe(basePlanInput.title);
  });

  it("updatePlan_同一versionで2件を同時実行_片方のみ成功しもう片方は失敗する（GATE-05、実DB並行更新）", async () => {
    const me = await createTestUser("plan-me4f@example.com", "自分4f");
    const plan = await createPlan(me.id, basePlanInput);

    const attempt = (title: string) =>
      updatePlan(plan.id, { ...basePlanInput, completed: false, version: plan.version, title }, plan.version);

    const results = await Promise.allSettled([attempt("並行更新A"), attempt("並行更新B")]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const detail = await findPlanById(plan.id);
    expect(detail?.version).toBe(plan.version + 1);
  });

  it("updatePlan_異なるプランへの同時更新は競合せずどちらも成功する（GATE-05、非競合時の正常系）", async () => {
    const me = await createTestUser("plan-me4g@example.com", "自分4g");
    const planA = await createPlan(me.id, { ...basePlanInput, title: "プランA並行" });
    const planB = await createPlan(me.id, { ...basePlanInput, title: "プランB並行" });

    const results = await Promise.allSettled([
      updatePlan(planA.id, { ...basePlanInput, completed: false, version: planA.version, title: "プランA並行（更新後）" }, planA.version),
      updatePlan(planB.id, { ...basePlanInput, completed: false, version: planB.version, title: "プランB並行（更新後）" }, planB.version),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
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

  // ─── setPlanCompleted（目標状態を受け取る冪等なset、DR-01選択肢1） ───
  it("setPlanCompleted_true指定_completedがtrueになりversionがincrementされる", async () => {
    const me = await createTestUser("plan-me8@example.com", "自分8");
    const plan = await createPlan(me.id, basePlanInput);

    const updated = await setPlanCompleted(plan.id, true, plan.version);

    expect(updated.completed).toBe(true);
    expect(updated.version).toBe(plan.version + 1);
  });

  it("setPlanCompleted_versionが実際と異なる_失敗する（楽観ロック）", async () => {
    const me = await createTestUser("plan-me8b@example.com", "自分8b");
    const plan = await createPlan(me.id, basePlanInput);
    const staleVersion = plan.version + 1;

    await expect(setPlanCompleted(plan.id, true, staleVersion)).rejects.toThrow();

    const detail = await findPlanById(plan.id);
    expect(detail?.completed).toBe(false);
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
    await setPlanCompleted(completedPlan.id, true, completedPlan.version);
    void activePlan;

    expect(await countActivePlansByUser(me.id)).toBe(1);
  });
});
