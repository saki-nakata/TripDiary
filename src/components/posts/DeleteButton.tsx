"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useQueryClient } from "@tanstack/react-query";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  postId: string;
};

export function DeleteButton({ postId }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  async function handleConfirm() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast("投稿を削除しました", "success");
      queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
      setTimeout(() => { window.location.href = "/"; }, 1200);
    } catch {
      showToast("削除に失敗しました", "error");
      setIsDeleting(false);
      setShowModal(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        data-testid="delete-post-button"
        className="px-3 py-1 text-sm border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950"
      >
        削除
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 flex flex-col gap-5">
            <div className="text-center">
              <TwemojiIcon codepoint="1f5d1" className="mx-auto mb-2 h-8 w-8" />
              <h2 className="text-base font-bold text-surface-foreground">投稿を削除しますか？</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">この操作は取り消せません。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-surface-border text-sm font-semibold text-surface-foreground hover:bg-zinc-50 dark:hover:bg-white/5 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
