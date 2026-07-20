"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PostCard } from "./PostCard";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import type { Post } from "@/types/post";

type Kind = "wishlist" | "visited";

const CONFIG: Record<
  Kind,
  { icon: string; alt: string; title: string; removed: string; confirmTitle: string }
> = {
  wishlist: {
    icon: "1f516",
    alt: "🔖",
    title: "行きたいから外す",
    removed: "「行きたい」から外しました",
    confirmTitle: "「行きたい」から外しますか？",
  },
  visited: {
    icon: "1f6a9",
    alt: "🚩",
    title: "訪問済みから外す",
    removed: "「訪問済み」から外しました",
    confirmTitle: "「訪問済み」から外しますか？",
  },
};

/**
 * 行きたい/訪問済みタブのカード。投稿を開かずに一覧から直接「外す」ためのボタンをオーバーレイする。
 * 楽観的にカードを消し、失敗したら元に戻す。件数バッジ（Server計算）は成功後に router.refresh() で更新する。
 * `onRemove`/`onRestore` は、このカードの楽観的な増減を親（SavedMapSection の地図濃淡・件数見出し）にも
 * 同じタイミングで反映させるための通知用コールバック（カード単体だけが消えて周辺の集計値が古いままになるのを防ぐ）。
 */
export function RemovableSavedCard({
  post,
  kind,
  onRemove,
  onRestore,
}: {
  post: Post;
  kind: Kind;
  onRemove?: (postId: string) => void;
  onRestore?: (postId: string) => void;
}) {
  const [removed, setRemoved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();
  const cfg = CONFIG[kind];

  if (removed) return null;

  // カード全体は <Link> のため、ボタン操作が遷移に化けないよう止めて確認ダイアログを開く
  function handleOpenConfirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setLoading(true);
    setShowConfirm(false);
    setRemoved(true); // 楽観的に一覧から消す
    onRemove?.(post.id);
    try {
      const res = await fetch(`/api/posts/${post.id}/${kind}`, { method: "POST" });
      if (!res.ok) throw new Error();
      showToast(cfg.removed, "success", 1500);
      // 件数バッジ（Server Component 計算）を反映
      router.refresh();
    } catch {
      setRemoved(false);
      setLoading(false);
      onRestore?.(post.id);
      showToast("エラーが発生しました", "error");
    }
  }

  return (
    <div className="group/saved relative">
      <PostCard post={post} />
      <button
        onClick={handleOpenConfirm}
        disabled={loading}
        title={cfg.title}
        aria-label={cfg.title}
        className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100 bg-white/70 xl:bg-white/85 shadow transition hover:bg-red-50 disabled:opacity-50 opacity-100 xl:opacity-0 xl:group-hover/saved:opacity-100"
      >
        <TwemojiIcon codepoint={cfg.icon} alt={cfg.alt} className="h-4 w-4" />
      </button>

      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          open={showConfirm}
          title={cfg.confirmTitle}
          description="いつでもリストに戻せます。"
          confirmLabel="外す"
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    </div>
  );
}
