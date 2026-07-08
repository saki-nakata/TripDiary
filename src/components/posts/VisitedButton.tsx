"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useRouter } from "next/navigation";

type Props = {
  postId: string;
  initialVisited: boolean;
  isLoggedIn: boolean;
};

export function VisitedButton({ postId, initialVisited, isLoggedIn }: Props) {
  const [visited, setVisited] = useState(initialVisited);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleClick() {
    if (!isLoggedIn) {
      router.push("/login");
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
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        visited
          ? "bg-green-50 text-green-600 hover:bg-green-100"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
      title={visited ? "訪問済みを解除" : "訪問済みにする"}
    >
      <span>✅</span>
      <span className="hidden sm:inline">{visited ? "訪問済み" : "訪問済みに追加"}</span>
    </button>
  );
}
