"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(data: LoginInput) {
    startTransition(async () => {
      // ログイン成功後の初回表示でモバイルのボトムナビを軽くバウンドさせ、
      // 長押しでラベルが出せることに気づいてもらうためのフラグ。
      // signIn()はデフォルトでリダイレクトするため、成功後にコードは戻ってこない。
      // 失敗時にフラグが残っても実害はない（次に成功した時に消費されるだけ）。
      // iPad SafariはIPアドレス直打ちアクセス時にsessionStorageへの書き込みで例外を
      // 投げることがあり、ここで止まるとsignIn()自体が呼ばれずログインできなくなる
      try {
        sessionStorage.setItem("justLoggedIn", "true");
      } catch {
        // ストレージアクセス不可の環境では単に演出をスキップする
      }
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        callbackUrl,
      });
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl bg-white px-9 py-14 shadow-md border border-[#e2e8f0]">
          <div className="text-center mb-7">
            <Link href="/" className="inline-flex items-center gap-1 group mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-[#16a34a] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="flex items-center gap-1.5 text-2xl font-bold text-[#16a34a] group-hover:opacity-70 transition-opacity">
                <TwemojiIcon codepoint="2708" alt="✈️" className="h-6 w-6" /> TripDiary
              </span>
            </Link>
            <p className="text-sm text-[#64748b]">旅のスポットを記録・共有しよう</p>
          </div>

          {urlError && (
            <div className="mb-4 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#ef4444]">
              メールアドレスまたはパスワードが正しくありません
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1e293b] mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                {...register("email")}
                placeholder="example@email.com"
                autoComplete="email"
                className={`w-full rounded-xl border px-4 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#16a34a]/20 bg-white ${errors.email ? "border-red-400 focus:border-red-400" : "border-[#e2e8f0] focus:border-[#16a34a]"}`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1e293b] mb-1">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="パスワードを入力"
                  autoComplete="current-password"
                  className={`peer w-full rounded-xl border px-4 py-2.5 pr-11 text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:ring-2 focus:ring-[#16a34a]/20 bg-white ${errors.password ? "border-red-400 focus:border-red-400" : "border-[#e2e8f0] focus:border-[#16a34a]"}`}
                />
                <button
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={() => setShowPassword(true)}
                    onTouchEnd={() => setShowPassword(false)}
                    onTouchCancel={() => setShowPassword(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] select-none touch-manipulation peer-placeholder-shown:hidden"
                    tabIndex={-1}
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

            <button
              type="submit"
              disabled={isPending}
              className="w-48 mx-auto block mt-6 rounded-full bg-[#16a34a] py-2.5 text-sm font-semibold text-white hover:bg-[#15803d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#64748b]">
            アカウントをお持ちでない方は{" "}
            <Link href="/signup" className="text-[#16a34a] font-semibold hover:underline">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
