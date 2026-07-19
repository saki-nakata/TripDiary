"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  postId: string;
  initialVisited: boolean;
  isLoggedIn: boolean;
  forcedVisited?: boolean;
};

export function VisitedButton({ postId, initialVisited, isLoggedIn, forcedVisited = false }: Props) {
  const [visited, setVisited] = useState(initialVisited || forcedVisited);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();

  async function handleClick() {
    if (forcedVisited) return;
    if (!isLoggedIn) {
      requireLogin("「訪問済み」に追加するにはログインが必要です");
      return;
    }
    if (loading) return;

    const prev = visited;
    setVisited(!visited);
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${postId}/visited`, { method: "POST" });
      if (!res.ok) throw new Error();
      showToast(visited ? "「訪問済み」を解除しました" : "「訪問済み」に追加しました", "success", 1500);
    } catch {
      setVisited(prev);
      showToast("エラーが発生しました", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || forcedVisited}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        visited
          ? `bg-green-50 text-green-600 ${forcedVisited ? "" : "hover:bg-green-100"}`
          : `bg-zinc-100 text-zinc-600 ${forcedVisited ? "" : "hover:bg-zinc-200"}`
      } ${forcedVisited ? "cursor-not-allowed" : ""}`}
      title={forcedVisited ? "自分の投稿です" : visited ? "訪問済みを解除" : "訪問済みにする"}
    >
      <TwemojiIcon codepoint={visited ? "1f6a9" : "1f3f3"} className="h-4 w-4" />
      <span className="hidden sm:inline">{visited ? "訪問済み" : "訪問済みに追加"}</span>
      <span className="sm:hidden">訪問済み</span>
    </button>
  );
}
