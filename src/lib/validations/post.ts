import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";

export const costBreakdownItemSchema = z.object({
  label: z.string().max(50),
  amount: z.number().int().min(0),
});

export const postSchema = z.object({
  title: z.string().min(1, "スポット名を入力してください").max(40, "スポット名は40文字以内で入力してください"),
  body: z.string().min(1, "感想・メモを入力してください").max(2000, "感想・メモは2000文字以内で入力してください"),
  location: z.string().min(1, "都道府県を選択してください").max(50),
  category: z.enum(CATEGORIES, { message: "カテゴリを選択してください" }),
  rating: z.number().int().min(1).max(5).optional(),
  visitedAt: z.string().min(1, "訪問日を入力してください"),
  costBreakdown: z.array(costBreakdownItemSchema).optional(),
  lat: z.number().min(-90, "緯度は-90〜90の範囲で入力してください").max(90, "緯度は-90〜90の範囲で入力してください").optional().nullable(),
  lng: z.number().min(-180, "経度は-180〜180の範囲で入力してください").max(180, "経度は-180〜180の範囲で入力してください").optional().nullable(),
  planId: z.string().optional().nullable(),
  imageUrls: z.array(z.string()).optional(),
});

export type PostInput = z.infer<typeof postSchema>;
