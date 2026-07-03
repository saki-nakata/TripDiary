import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "メールアドレスを入力してください").email("メールアドレスの形式が正しくありません"),
  password: z.string().min(1, "パスワードを入力してください"),
});

const signupBaseSchema = z.object({
  nickname: z.string().min(1, "ニックネームを入力してください").max(20, "ニックネームは20文字以内で入力してください"),
  email: z.string().min(1, "メールアドレスを入力してください").email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください"),
  confirmPassword: z.string().min(1, "確認用パスワードを入力してください"),
});

export const signupSchema = signupBaseSchema.refine((data) => data.password === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

// API は confirmPassword を受け取らないため、フロントエンド専用バリデーションとは分離する
export const signupApiSchema = signupBaseSchema.pick({ nickname: true, email: true, password: true });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupBaseSchema>;
export type SignupApiInput = z.infer<typeof signupApiSchema>;
