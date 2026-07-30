import "@/lib/openapi/zod-setup";
import { z } from "zod";

export const budgetBreakdownItemSchema = z.object({
  label: z.string().max(50),
  amount: z.number().int().min(0),
});

export const planSpotInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("post"), postId: z.string() }),
  z.object({
    type: z.literal("free"),
    title: z.string().min(1, "スポット名を入力してください").max(60, "スポット名は60文字以内で入力してください"),
    location: z.string().min(1, "エリアを選択してください").max(50),
    category: z.string().max(20).optional().nullable(),
  }),
]);

export const planSchema = z
  .object({
    title: z.string().min(1, "タイトルを入力してください").max(60, "タイトルは60文字以内で入力してください"),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    budgetBreakdown: z.array(budgetBreakdownItemSchema).optional(),
    memo: z.string().optional().nullable(),
    spots: z.array(planSpotInputSchema).optional(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || new Date(data.endDate) >= new Date(data.startDate),
    { message: "帰着日は出発日以降の日付にしてください", path: ["endDate"] }
  );

export type PlanInput = z.infer<typeof planSchema>;

// 更新専用スキーマ（GATE-05楽観ロック・GATE-21完了状態統合）。作成用のplanSchemaとは分離し、
// completed/versionが作成時に紛れ込む余地を作らない（postSchema/postUpdateSchemaと同じパターン）
export const planUpdateSchema = planSchema.extend({
  completed: z.boolean(),
  version: z.number().int().nonnegative(),
});

export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

// PATCH /api/plans/[id]/complete 専用（GATE-21）。目標状態completedとversionを受け取る冪等な
// set。旧仕様（引数なしで現在値を反転するトグル）から変更した
export const planCompleteSchema = z.object({
  completed: z.boolean(),
  version: z.number().int().nonnegative(),
});

export type PlanCompleteInput = z.infer<typeof planCompleteSchema>;
