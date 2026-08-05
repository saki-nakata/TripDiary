"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { Logo } from "@/components/ui/Logo";

export default function SignupPage() {
  const [apiError, setApiError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  function onSubmit(data: SignupInput) {
    setApiError("");
    startTransition(async () => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: data.nickname, email: data.email, password: data.password }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setApiError("このメールアドレスはすでに使用されています");
        } else {
          setApiError(json.error ?? "登録に失敗しました。もう一度お試しください");
        }
        return;
      }

      // redirect:falseにすることで、ログイン成功後にPOST /api/me/themeを挟んでから
      // フルナビゲーションできるようにする（テーマ設定のCookie→DB同期、PR-7b）
      const result = await signIn("credentials", { email: data.email, password: data.password, redirect: false, callbackUrl: "/" });

      if (result?.error) {
        setApiError("登録は完了しましたが、自動ログインに失敗しました。ログイン画面からログインしてください");
        return;
      }

      try {
        await fetch("/api/me/theme", { method: "POST" });
      } catch {
        // テーマ同期に失敗してもログイン自体は継続する
      }
      window.location.assign(result?.url ?? "/");
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl bg-surface px-9 py-10 shadow-md border border-surface-border">
          <div className="text-center mb-7">
            <Link href="/" className="inline-flex items-center gap-1 group mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#16a34a] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="flex items-center gap-1.5 text-2xl font-bold group-hover:opacity-70 transition-opacity">
                <TwemojiIcon codepoint="2708" alt="✈️" className="h-6 w-6" />
                <Logo variant="guest" />
              </span>
            </Link>
            <p className="text-sm text-[#64748b] dark:text-zinc-400">アカウントを作成して旅を記録しよう</p>
          </div>

          {apiError && (
            <div className="mb-4 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#ef4444] dark:bg-red-950 dark:border-red-900 dark:text-red-300">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-surface-foreground mb-1">
                ニックネーム
              </label>
              <input
                id="nickname"
                type="text"
                {...register("nickname")}
                placeholder="例：旅人さくら"
                autoComplete="nickname"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-surface-foreground placeholder:text-[#94a3b8] dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-green-700 bg-surface ${errors.nickname ? "border-red-400 focus:border-red-400" : "border-surface-border focus:border-[#16a34a]"}`}
              />
              {errors.nickname && <p className="mt-1 text-xs text-red-500">{errors.nickname.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-surface-foreground mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                placeholder="example@email.com"
                autoComplete="email"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-surface-foreground placeholder:text-[#94a3b8] dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-green-700 bg-surface ${errors.email ? "border-red-400 focus:border-red-400" : "border-surface-border focus:border-[#16a34a]"}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-foreground mb-1">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="8文字以上で入力してください"
                  autoComplete="new-password"
                  className={`peer w-full rounded-xl border px-4 py-2.5 pr-11 text-sm text-surface-foreground placeholder:text-[#94a3b8] dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-green-700 bg-surface ${errors.password ? "border-red-400 focus:border-red-400" : "border-surface-border focus:border-[#16a34a]"}`}
                />
                <button
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    onTouchCancel={() => setShowPassword(false)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowPassword(true); } }}
                    onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") setShowPassword(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] dark:text-zinc-500 dark:hover:text-zinc-300 select-none touch-manipulation peer-placeholder-shown:hidden"
                    aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-surface-foreground mb-1">
                パスワード（確認）
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  placeholder="もう一度入力してください"
                  autoComplete="new-password"
                  className={`peer w-full rounded-xl border px-4 py-2.5 pr-11 text-sm text-surface-foreground placeholder:text-[#94a3b8] dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-green-700 bg-surface ${errors.confirmPassword ? "border-red-400 focus:border-red-400" : "border-surface-border focus:border-[#16a34a]"}`}
                />
                <button
                    type="button"
                    onMouseDown={() => setShowConfirmPassword(true)}
                    onMouseUp={() => setShowConfirmPassword(false)}
                    onMouseLeave={() => setShowConfirmPassword(false)}
                    onTouchStart={() => setShowConfirmPassword(true)}
                    onTouchEnd={() => setShowConfirmPassword(false)}
                    onTouchCancel={() => setShowConfirmPassword(false)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowConfirmPassword(true); } }}
                    onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") setShowConfirmPassword(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] dark:text-zinc-500 dark:hover:text-zinc-300 select-none touch-manipulation peer-placeholder-shown:hidden"
                    aria-label={showConfirmPassword ? "パスワードを隠す" : "パスワードを表示"}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-48 mx-auto block mt-6 rounded-full bg-[#15803d] py-2.5 text-sm font-semibold text-white hover:bg-[#166534] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "登録中..." : "登録する"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#64748b] dark:text-zinc-400">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="text-[#15803d] dark:text-[#4ade80] font-semibold hover:underline">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
