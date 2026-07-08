"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = {
  postId: string;
};

export function MyPostActions({ postId }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleConfirm() {
    setIsDeleting(true);
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    setIsDeleting(false);
    setShowModal(false);
    if (res.ok) {
      showToast("投稿を削除しました", "success");
      router.refresh();
    } else {
      showToast("削除に失敗しました", "error");
    }
  }

  return (
    <>
      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/posts/${postId}/edit`);
          }}
          title="編集"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 shadow hover:bg-green-100 text-sm"
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowModal(true);
          }}
          title="削除"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 shadow hover:bg-red-100 text-sm"
        >
          🗑️
        </button>
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          open={showModal}
          title="投稿を削除しますか？"
          description="この操作は取り消せません。"
          confirmLabel={isDeleting ? "削除中..." : "削除する"}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      </div>
    </>
  );
}
