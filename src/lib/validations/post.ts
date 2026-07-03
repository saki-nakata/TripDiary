import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";

export const costBreakdownItemSchema = z.object({
  label: z.string().min(1).max(50),
  amount: z.number().int().min(0),
});

export const postSchema = z.object({
  title: z.string().min(1, "スポット名を入力してください").max(40, "スポット名は40文字以内で入力してください"),
  body: z.string().min(1, "感想・メモを入力してください").max(2000, "感想・メモは2000文字以内で入力してください"),
  prefecture: z.string().min(1, "都道府県を選択してください").max(50),
  category: z.enum(CATEGORIES, { message: "カテゴリを選択してください" }),
  rating: z.number().int().min(1).max(5).optional(),
  visitedAt: z.string().min(1, "訪問日を入力してください"),
  costBreakdown: z.array(costBreakdownItemSchema).optional(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  planId: z.string().optional().nullable(),
});

export type PostInput = z.infer<typeof postSchema>;
