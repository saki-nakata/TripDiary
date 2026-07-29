import { prisma } from "@/lib/prisma";
import type { PlanInput, PlanUpdateInput } from "@/lib/validations/plan";

const PLAN_SELECT = {
  id: true,
  title: true,
  startDate: true,
  endDate: true,
  budget: true,
  budgetBreakdown: true,
  memo: true,
  completed: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  version: true,
} as const;

const SPOT_POST_SELECT = {
  id: true,
  title: true,
  location: true,
  category: true,
  rating: true,
  lat: true,
  lng: true,
  authorId: true,
  images: { take: 1, orderBy: { displayOrder: "asc" as const }, select: { url: true } },
} as const;

const LINKED_POST_SELECT = {
  id: true,
  title: true,
  location: true,
  category: true,
  visitedAt: true,
  images: { take: 1, orderBy: { displayOrder: "asc" as const }, select: { url: true } },
} as const;

type PlanWithBudget = PlanInput & { budget: number | null };
type PlanUpdateWithBudget = PlanUpdateInput & { budget: number | null };

export async function findPlanAuthorId(planId: string): Promise<string | null> {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { userId: true } });
  return plan?.userId ?? null;
}

export async function findPlansByUserId(userId: string) {
  const plans = await prisma.plan.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { startDate: "asc" }, { createdAt: "desc" }],
    select: { ...PLAN_SELECT, _count: { select: { planSpots: true } } },
  });
  return plans.map(formatPlan);
}

export async function findPlanById(id: string) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: {
      ...PLAN_SELECT,
      planSpots: {
        orderBy: { displayOrder: "asc" },
        select: {
          displayOrder: true,
          freeTitle: true,
          freeLocation: true,
          freeCategory: true,
          post: { select: SPOT_POST_SELECT },
        },
      },
      posts: {
        orderBy: { createdAt: "desc" },
        select: LINKED_POST_SELECT,
      },
    },
  });
  if (!plan) return null;
  return formatPlanDetail(plan);
}

function toPlanSpotCreateData(planId: string, spots: PlanWithBudget["spots"]) {
  return (spots ?? []).map((spot, displayOrder) =>
    spot.type === "post"
      ? { planId, postId: spot.postId, displayOrder }
      : {
          planId,
          freeTitle: spot.title,
          freeLocation: spot.location ?? null,
          freeCategory: spot.category ?? null,
          displayOrder,
        }
  );
}

export async function createPlan(userId: string, data: PlanWithBudget) {
  const { spots, budgetBreakdown, startDate, endDate, budget, ...rest } = data;

  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        ...rest,
        userId,
        budget,
        budgetBreakdown: budgetBreakdown && budgetBreakdown.length > 0 ? budgetBreakdown : undefined,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      select: PLAN_SELECT,
    });

    if (spots && spots.length > 0) {
      await tx.planSpot.createMany({ data: toPlanSpotCreateData(plan.id, spots) });
    }

    return formatPlan(plan);
  });
}

export async function updatePlan(id: string, data: PlanUpdateWithBudget, expectedVersion: number) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { spots, budgetBreakdown, startDate, endDate, budget, version, ...rest } = data;

  return prisma.$transaction(async (tx) => {
    // completed（GATE-21）とversion判定（GATE-05）を同一のtx.plan.update呼び出しに含める。
    // version不一致（他の更新が先に成功済み）の場合は0件更新となりPrismaがP2025を投げる
    const plan = await tx.plan.update({
      where: { id, version: expectedVersion },
      data: {
        ...rest,
        budget,
        budgetBreakdown: budgetBreakdown && budgetBreakdown.length > 0 ? budgetBreakdown : undefined,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        version: { increment: 1 },
      },
      select: PLAN_SELECT,
    });

    if (spots !== undefined) {
      await tx.planSpot.deleteMany({ where: { planId: id } });
      if (spots.length > 0) {
        await tx.planSpot.createMany({ data: toPlanSpotCreateData(id, spots) });
      }
    }

    return formatPlan(plan);
  });
}

export async function deletePlan(id: string) {
  return prisma.plan.delete({ where: { id } });
}

export async function setPlanCompleted(id: string, completed: boolean, expectedVersion: number) {
  // 目標状態completedを受け取る冪等なset（旧: 現在値を読んで反転するトグル）。GATE-21対応の一環として
  // PlanActions.tsx単独の完了トグルにもversionロックを適用する（DR-01選択肢1）
  const plan = await prisma.plan.update({
    where: { id, version: expectedVersion },
    data: { completed, version: { increment: 1 } },
    select: PLAN_SELECT,
  });
  return formatPlan(plan);
}

export async function findExistingPostIds(postIds: string[]) {
  if (postIds.length === 0) return [];
  const posts = await prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true } });
  return posts.map((p) => p.id);
}

export async function countActivePlansByUser(userId: string) {
  return prisma.plan.count({ where: { userId, completed: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPlan(plan: any) {
  const { _count, ...rest } = plan;
  return {
    ...rest,
    startDate: plan.startDate instanceof Date ? plan.startDate.toISOString() : plan.startDate,
    endDate: plan.endDate instanceof Date ? plan.endDate.toISOString() : plan.endDate,
    createdAt: plan.createdAt instanceof Date ? plan.createdAt.toISOString() : plan.createdAt,
    updatedAt: plan.updatedAt instanceof Date ? plan.updatedAt.toISOString() : plan.updatedAt,
    ...(_count ? { spotCount: _count.planSpots } : {}),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatPlanDetail(plan: any) {
  const { planSpots, posts, ...rest } = plan;
  return {
    ...formatPlan(rest),
    spots: planSpots.map(
      (s: { displayOrder: number; post: unknown; freeTitle: string | null; freeLocation: string | null; freeCategory: string | null }) => ({
        displayOrder: s.displayOrder,
        post: s.post ?? null,
        freeTitle: s.freeTitle,
        freeLocation: s.freeLocation,
        freeCategory: s.freeCategory,
      })
    ),
    linkedPosts: posts.map((p: { visitedAt: Date; [key: string]: unknown }) => ({
      ...p,
      visitedAt: p.visitedAt instanceof Date ? p.visitedAt.toISOString() : p.visitedAt,
    })),
  };
}
