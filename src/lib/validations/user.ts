import "@/lib/openapi/zod-setup";
import { z } from "zod";

export const userUpdateSchema = z.object({
  nickname: z.string().min(1, "ニックネームを入力してください").max(20, "ニックネームは20文字以内で入力してください"),
  bio: z.string().max(200, "自己紹介は200文字以内で入力してください").optional().nullable(),
  image: z.string().optional().nullable(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

const passwordChangeBaseSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください"),
  confirmNewPassword: z.string().min(1, "確認用パスワードを入力してください"),
});

export const passwordChangeSchema = passwordChangeBaseSchema.refine(
  (data) => data.newPassword === data.confirmNewPassword,
  { message: "新しいパスワードが一致しません", path: ["confirmNewPassword"] }
);

// API は confirmNewPassword を受け取らないため、フロントエンド専用バリデーションとは分離する（signupApiSchema と同じ方針）
export const passwordChangeApiSchema = passwordChangeBaseSchema.pick({
  currentPassword: true,
  newPassword: true,
});

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type PasswordChangeApiInput = z.infer<typeof passwordChangeApiSchema>;

export const emailChangeSchema = z.object({
  email: z.string().min(1, "メールアドレスを入力してください").email("メールアドレスの形式が正しくありません"),
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
});

export type EmailChangeInput = z.infer<typeof emailChangeSchema>;
