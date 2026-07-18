"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useToast } from "@/contexts/toast-context";

/**
 * 未ログインユーザーがログイン必須のアクション（フォロー・いいね等）を行おうとした際に、
 * 短いトーストで理由を伝えてから、今の画面に戻ってこられるよう callbackUrl 付きで
 * /login へ誘導する。「見せて誘って、戻す」という一般的なパターンに合わせる。
 */
export function useRequireLogin() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  return function requireLogin(message: string) {
    showToast(message, "info", 1800);
    const query = searchParams.toString();
    const callbackUrl = query ? `${pathname}?${query}` : pathname;
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };
}
