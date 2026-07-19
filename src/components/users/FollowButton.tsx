"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  userId: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
  /** "sm" は検索結果一覧などカードが密集する場所向けの小さめサイズ */
  size?: "sm" | "md";
};

export function FollowButton({ userId, initialFollowing, isLoggedIn, size = "md" }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();

  async function handleClick() {
    if (!isLoggedIn) {
      requireLogin("フォローするにはログインが必要です");
      return;
    }
    if (loading) return;

    const prev = following;
    const next = !following;
    setFollowing(next);
    setLoading(true);

    try {
      const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
      if (!res.ok) throw new Error();
      showToast(next ? "フォローしました" : "フォローを解除しました", "success", 1500);
    } catch {
      setFollowing(prev);
      showToast("エラーが発生しました", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      data-testid="follow-button"
      title={following ? "フォローを解除" : "フォローする"}
      className={`flex rounded-full font-semibold transition-colors shrink-0 ${
        size === "sm"
          ? "flex-col items-center justify-center gap-0.5 px-2 py-1 text-[0.65rem] leading-none sm:flex-row sm:gap-1.5 sm:px-5 sm:py-2 sm:text-sm md:flex-col md:gap-0.5 md:px-2 md:py-1 md:text-[0.65rem] xl:flex-row xl:gap-1.5 xl:px-5 xl:py-2 xl:text-sm"
          : "flex-row items-center gap-1.5 px-5 py-2 text-sm"
      } ${
        following
          ? "bg-green-50 text-green-600 hover:bg-green-100"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {following ? (
        <TwemojiIcon codepoint="1f465" className={size === "sm" ? "h-3 w-3 sm:h-4 sm:w-4 md:h-3 md:w-3 xl:h-4 xl:w-4" : "h-4 w-4"} />
      ) : (
        <span>➕</span>
      )}
      <span>{following ? "フォロー中" : "フォロー"}</span>
    </button>
  );
}
