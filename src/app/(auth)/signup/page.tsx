"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nickname || !email || !password || !confirmPassword) {
      setError("すべての項目を入力してください");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setError("このメールアドレスはすでに使用されています");
        } else if (data.error) {
          setError(data.error);
        } else {
          setError("登録に失敗しました。もう一度お試しください");
        }
        return;
      }

      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      router.push("/dashboard");
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6">
      <div className="w-full max-w-[420px] rounded-2xl bg-white px-9 py-10 shadow-md border border-[#e2e8f0]">
        <div className="text-center mb-7">
          <p className="text-2xl font-bold text-[#16a34a] mb-2">✈️ TripDiary</p>
          <p className="text-sm text-[#64748b]">アカウントを作成して旅を記録しよう</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#ef4444]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-[#1e293b] mb-1">
              ニックネーム
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="例：旅人さくら"
              autoComplete="nickname"
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 bg-white"
            />
          </div>

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
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 bg-white"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1e293b] mb-1">
              パスワード（確認）
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="もう一度入力してください"
              autoComplete="new-password"
              className="w-full rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-sm text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/20 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#16a34a] py-2.5 text-sm font-semibold text-white hover:bg-[#15803d] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "登録中..." : "登録する"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#64748b]">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="text-[#16a34a] font-semibold hover:underline">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
