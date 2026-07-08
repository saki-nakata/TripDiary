import { z } from "zod";

export const userUpdateSchema = z.object({
  nickname: z.string().min(1, "ニックネームを入力してください").max(20, "ニックネームは20文字以内で入力してください"),
  bio: z.string().max(200, "自己紹介は200文字以内で入力してください").optional().nullable(),
  image: z.string().optional().nullable(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
