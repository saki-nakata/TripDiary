import {
  findPlanAuthorId,
  findPlanAuthorAndCompleted,
  findPlansByUserId,
  findPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  setPlanCompleted,
  findExistingPostIds,
  countActivePlansByUser,
} from "@/lib/repositories/plan.repository";
import type { PlanInput } from "@/lib/validations/plan";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";

function withComputedBudget(data: PlanInput) {
  const filtered = (data.budgetBreakdown ?? []).filter((item) => item.amount > 0 || item.label.trim() !== "");
  const budget = filtered.length > 0 ? filtered.reduce((sum, item) => sum + item.amount, 0) : null;
  return { ...data, budgetBreakdown: filtered.length > 0 ? filtered : undefined, budget };
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

export async function updatePlanService(userId: string, id: string, data: PlanInput) {
  const authorId = await findPlanAuthorId(id);
  if (!authorId) throw new NotFoundError();
  if (authorId !== userId) throw new ForbiddenError();

  await assertSpotsExist(data.spots);
  return updatePlan(id, withComputedBudget(data));
}

export async function deletePlanService(userId: string, id: string) {
  const authorId = await findPlanAuthorId(id);
  if (!authorId) throw new NotFoundError();
  if (authorId !== userId) throw new ForbiddenError();
  return deletePlan(id);
}

export async function togglePlanCompletedService(userId: string, id: string) {
  const plan = await findPlanAuthorAndCompleted(id);
  if (!plan) throw new NotFoundError();
  if (plan.userId !== userId) throw new ForbiddenError();

  return setPlanCompleted(id, !plan.completed);
}
