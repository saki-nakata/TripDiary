"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  postId: string;
  initialWishlisted: boolean;
  isLoggedIn: boolean;
  isAuthor?: boolean;
};

export function WishlistButton({ postId, initialWishlisted, isLoggedIn, isAuthor = false }: Props) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();

  async function handleClick() {
    if (!isLoggedIn) {
      requireLogin("「行きたい」に追加するにはログインが必要です");
      return;
    }
    if (loading) return;

    const prev = wishlisted;
    setWishlisted(!wishlisted);
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/wishlist`, { method: "POST" });
      if (!res.ok) throw new Error();
      showToast(wishlisted ? "「行きたい」を解除しました" : "「行きたい」に追加しました", "success", 1500);
    } catch {
      setWishlisted(prev);
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
        wishlisted
          ? "bg-blue-50 text-blue-500 hover:bg-blue-100"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
      title={wishlisted ? "行きたいを解除" : "行きたいに追加"}
    >
      {wishlisted ? <TwemojiIcon codepoint="1f516" className="h-4 w-4" /> : <span>🔖</span>}
      <span className="hidden sm:inline">
        {isAuthor ? (wishlisted ? "また行きたい！" : "また行きたい？") : wishlisted ? "行きたい！" : "行きたい？"}
      </span>
      <span className="sm:hidden">{isAuthor ? "また行きたい" : "行きたい"}</span>
    </button>
  );
}
