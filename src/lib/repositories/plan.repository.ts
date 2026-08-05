import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/errors";
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

// マイページ「旅行プラン」タブの継続取得API（GATE-22種類B）。進行中プランのみを対象に、
// idを末尾のタイブレーカーとして安定した順序でページングする
export async function findActivePlansByUserId({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const plans = await prisma.plan.findMany({
    where: { userId, completed: false },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ startDate: "asc" }, { id: "asc" }],
    select: { ...PLAN_SELECT, _count: { select: { planSpots: true } } },
  });

  const hasMore = plans.length > limit;
  const items = hasMore ? plans.slice(0, limit) : plans;
  return {
    plans: items.map(formatPlan),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

// マイページ「旅行プラン」タブの完了済みプラン継続取得API（GATE-22種類B）。yearを指定すると
// startDateがその年のものだけに絞り込む。未指定（全期間）の場合はstartDate未設定の完了済み
// プランも含める（従来の「全期間」表示と同じ範囲を維持する）
export async function findCompletedPlansByUserId({
  userId,
  year,
  cursor,
  limit = 20,
}: {
  userId: string;
  year?: number;
  cursor?: string;
  limit?: number;
}) {
  const dateFilter =
    year != null
      ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
      : undefined;
  const plans = await prisma.plan.findMany({
    where: { userId, completed: true, ...(dateFilter ? { startDate: dateFilter } : {}) },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    select: { ...PLAN_SELECT, _count: { select: { planSpots: true } } },
  });

  const hasMore = plans.length > limit;
  const items = hasMore ? plans.slice(0, limit) : plans;
  return {
    plans: items.map(formatPlan),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

// 完了済みプランが存在する年の一覧（startDate未設定分は対象外）。ページングされた取得結果とは
// 独立に、全期間を対象とした軽量なDISTINCT集計で取得する（年フィルタの選択肢を常に完全な状態に保つため）
export async function findCompletedPlanYears(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ year: number }>>`
    SELECT DISTINCT YEAR(startDate) AS year
    FROM plans
    WHERE userId = ${userId} AND completed = true AND startDate IS NOT NULL
    ORDER BY year DESC
  `;
  return rows.map((r) => Number(r.year));
}

export async function countCompletedPlansByUserId(userId: string, year?: number) {
  const dateFilter =
    year != null
      ? { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
      : undefined;
  return prisma.plan.count({
    where: { userId, completed: true, ...(dateFilter ? { startDate: dateFilter } : {}) },
  });
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
    // completed（GATE-21）とversion判定（GATE-05）を同一のUPDATEに含める。
    const { count } = await tx.plan.updateMany({
      where: { id, version: expectedVersion },
      data: {
        ...rest,
        budget,
        // budgetBreakdownがundefinedの場合はフィールド自体を更新しない（既存値を保持）。
        // 空配列（全項目削除）の場合はundefinedではなくPrisma.DbNullを明示し、DB上の値をNULLへ更新する
        // （undefinedのままだとPrismaが「未変更」と解釈し、削除前の値が残ってしまう不具合〔第4ラウンドレビューA-2〕だった）
        budgetBreakdown: budgetBreakdown === undefined ? undefined : budgetBreakdown.length > 0 ? budgetBreakdown : Prisma.DbNull,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        version: { increment: 1 },
      },
    });
    if (count !== 1) throw new ConflictError("他の画面で更新されています。再読み込みしてください。");

    if (spots !== undefined) {
      await tx.planSpot.deleteMany({ where: { planId: id } });
      if (spots.length > 0) {
        await tx.planSpot.createMany({ data: toPlanSpotCreateData(id, spots) });
      }
    }

    const plan = await tx.plan.findUniqueOrThrow({ where: { id }, select: PLAN_SELECT });
    return formatPlan(plan);
  });
}

export async function deletePlan(id: string) {
  return prisma.plan.delete({ where: { id } });
}

export async function setPlanCompleted(id: string, completed: boolean, expectedVersion: number) {
  // 目標状態completedを受け取る冪等なset（旧: 現在値を読んで反転するトグル）。GATE-21対応の一環として
  // PlanActions.tsx単独の完了トグルにもversionロックを適用する（DR-01選択肢1）
  const { count } = await prisma.plan.updateMany({
    where: { id, version: expectedVersion },
    data: { completed, version: { increment: 1 } },
  });
  if (count !== 1) throw new ConflictError("他の画面で更新されています。再読み込みしてください。");
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id }, select: PLAN_SELECT });
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
