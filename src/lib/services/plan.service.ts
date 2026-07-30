import {
  findPlanAuthorId,
  findPlansByUserId,
  findActivePlansByUserId,
  findCompletedPlansByUserId,
  findCompletedPlanYears,
  countCompletedPlansByUserId,
  findPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  setPlanCompleted,
  findExistingPostIds,
  countActivePlansByUser,
} from "@/lib/repositories/plan.repository";
import { Prisma } from "@prisma/client";
import type { PlanInput, PlanUpdateInput } from "@/lib/validations/plan";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "@/lib/errors";

function withComputedBudget<T extends PlanInput>(data: T): T & { budget: number | null } {
  const filtered = (data.budgetBreakdown ?? []).filter((item) => item.amount > 0 || item.label.trim() !== "");
  return { ...data, budgetBreakdown: filtered.length > 0 ? filtered : undefined, budget: filtered.length > 0 ? filtered.reduce((sum, item) => sum + item.amount, 0) : null };
}

async function assertSpotsExist(spots?: PlanInput["spots"]) {
  const postIds = (spots ?? []).filter((s) => s.type === "post").map((s) => s.postId);
  if (postIds.length === 0) return;
  const existingIds = await findExistingPostIds(postIds);
  const missing = postIds.filter((id) => !existingIds.includes(id));
  if (missing.length > 0) {
    throw new ValidationError("存在しないスポットが含まれています", {
      spots: [`存在しない投稿IDが含まれています: ${missing.join(", ")}`],
    });
  }
}

export async function findPlansByUserIdService(userId: string) {
  return findPlansByUserId(userId);
}

export async function findActivePlansByUserIdService(params: { userId: string; cursor?: string; limit?: number }) {
  return findActivePlansByUserId(params);
}

export async function findCompletedPlansByUserIdService(params: {
  userId: string;
  year?: number;
  cursor?: string;
  limit?: number;
}) {
  return findCompletedPlansByUserId(params);
}

export async function getCompletedPlanYearsService(userId: string) {
  return findCompletedPlanYears(userId);
}

export async function countCompletedPlansByUserService(userId: string, year?: number) {
  return countCompletedPlansByUserId(userId, year);
}

export async function countActivePlansByUserService(userId: string) {
  return countActivePlansByUser(userId);
}

export async function findPlanByIdService(userId: string, id: string) {
  const plan = await findPlanById(id);
  if (!plan) throw new NotFoundError();
  if (plan.userId !== userId) throw new ForbiddenError();
  return plan;
}

export async function createPlanService(userId: string, data: PlanInput) {
  await assertSpotsExist(data.spots);
  return createPlan(userId, withComputedBudget(data));
}

export async function updatePlanService(userId: string, id: string, data: PlanUpdateInput) {
  const authorId = await findPlanAuthorId(id);
  if (!authorId) throw new NotFoundError();
  if (authorId !== userId) throw new ForbiddenError();

  await assertSpotsExist(data.spots);
  try {
    return await updatePlan(id, withComputedBudget(data), data.version);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ConflictError("他の画面で更新されています。再読み込みしてください。");
    }
    throw e;
  }
}

export async function deletePlanService(userId: string, id: string) {
  const authorId = await findPlanAuthorId(id);
  if (!authorId) throw new NotFoundError();
  if (authorId !== userId) throw new ForbiddenError();
  return deletePlan(id);
}

// 目標状態completedを受け取る冪等なset（DR-01選択肢1）。PlanActions.tsxの完了トグルUIから、
// 現在値を反転した値＋versionを送ってもらう形に変更した（旧togglePlanCompletedServiceは
// 引数なしで現在値を読んで反転するトグルだったため、再送時に意図せず二重反転する余地があった）
export async function setPlanCompletedService(userId: string, id: string, completed: boolean, expectedVersion: number) {
  const authorId = await findPlanAuthorId(id);
  if (!authorId) throw new NotFoundError();
  if (authorId !== userId) throw new ForbiddenError();

  try {
    return await setPlanCompleted(id, completed, expectedVersion);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new ConflictError("他の画面で更新されています。再読み込みしてください。");
    }
    throw e;
  }
}
