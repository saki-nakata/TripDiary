"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useRouter } from "next/navigation";

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
      className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
        following
          ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          : "bg-[#16a34a] text-white hover:bg-[#15803d]"
      }`}
    >
      {following ? "フォロー中" : "フォロー"}
    </button>
  );
}
