"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        router.push("/dashboard");
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-9 py-10 shadow-md border border-[#e2e8f0]">
        <div className="text-center mb-7">
          <p className="text-2xl font-bold text-[#16a34a] mb-2">✈️ TripDiary</p>
          <p className="text-sm text-[#64748b]">旅のスポットを記録・共有しよう</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#1e293b] mb-1">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              autoComplete="email"
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 bg-white"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1e293b] mb-1">
              パスワード
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                className="w-full rounded-xl border border-[#e2e8f0] px-4 py-2.5 pr-11 text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 bg-white"
              />
              <button
                type="button"
                onMouseDown={() => setShowPassword(true)}
                onMouseUp={() => setShowPassword(false)}
                onMouseLeave={() => setShowPassword(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#64748b] select-none"
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
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#16a34a] py-2.5 text-sm font-semibold text-white hover:bg-[#15803d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
    </main>
  );
}
