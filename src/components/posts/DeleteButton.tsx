"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";

type Props = {
  postId: string;
};

export function DeleteButton({ postId }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleConfirm() {
    setIsDeleting(true);
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("投稿を削除しました", "success");
      setTimeout(() => { window.location.href = "/"; }, 1200);
    } else {
      showToast("削除に失敗しました", "error");
      setIsDeleting(false);
      setShowModal(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
      >
        削除
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 flex flex-col gap-5">
            <div className="text-center">
              <p className="text-2xl mb-2">🗑️</p>
              <h2 className="text-base font-bold text-zinc-900">投稿を削除しますか？</h2>
              <p className="text-sm text-zinc-500 mt-1">この操作は取り消せません。</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
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
