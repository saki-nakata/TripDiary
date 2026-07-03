"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useRouter } from "next/navigation";

type Props = {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isLoggedIn: boolean;
};

export function LikeButton({ postId, initialLiked, initialCount, isLoggedIn }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleClick() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (loading) return;

    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) throw new Error();
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      showToast("エラーが発生しました", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        liked
          ? "bg-red-50 text-red-500 hover:bg-red-100"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      <span>{liked ? "❤️" : "🤍"}</span>
      <span>{count}</span>
    </button>
  );
}
