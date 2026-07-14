"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useRouter } from "next/navigation";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  userId: string;
  initialFollowing: boolean;
  isLoggedIn: boolean;
};

export function FollowButton({ userId, initialFollowing, isLoggedIn }: Props) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleClick() {
    if (!isLoggedIn) {
      router.push("/login");
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
      className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
        following
          ? "bg-green-50 text-green-600 hover:bg-green-100"
          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {following ? <TwemojiIcon codepoint="1f465" className="h-4 w-4" /> : <span>➕</span>}
      {following ? "フォロー中" : "フォロー"}
    </button>
  );
}
