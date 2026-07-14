"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/toast-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  planId: string;
  completed: boolean;
  variant?: "full" | "icons";
};

export function PlanActions({ planId, completed, variant = "full" }: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  async function handleToggleComplete() {
    const res = await fetch(`/api/plans/${planId}/complete`, { method: "PATCH" });
    if (res.ok) {
      showToast(completed ? "完了を取り消しました" : "旅行を完了済みにしました");
      router.refresh();
    } else {
      showToast("処理に失敗しました", "error");
    }
  }

  async function handleDelete() {
    setIsSubmitting(true);
    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    setIsSubmitting(false);
    setShowDeleteModal(false);
    if (res.ok) {
      showToast("プランを削除しました");
      router.push("/mypage?tab=plans");
      router.refresh();
    } else {
      showToast("削除に失敗しました", "error");
    }
  }

  if (variant === "icons") {
    return (
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => router.push(`/plans/${planId}/edit`)}
          aria-label="編集"
          title="編集"
          className="rounded-lg p-2 text-zinc-500 hover:bg-green-100 hover:text-zinc-700 transition-colors"
        >
          <TwemojiIcon codepoint="270f" className="h-4 w-4" />
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          aria-label="削除"
          title="削除"
          className="rounded-lg p-2 text-zinc-500 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <TwemojiIcon codepoint="1f5d1" className="h-4 w-4" />
        </button>

        <ConfirmDialog
          open={showDeleteModal}
          title="プランを削除しますか？"
          description="この操作は取り消せません。"
          confirmLabel={isSubmitting ? "削除中..." : "削除する"}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <label
        className={`-mt-3 mr-0 flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold transition-colors cursor-pointer select-none ${
          completed
            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
            : "border border-blue-500 text-blue-700 hover:bg-blue-50"
        }`}
      >
        <input
          type="checkbox"
          data-testid="plan-completed-checkbox"
          checked={completed}
          onChange={handleToggleComplete}
          className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-green-600 focus:ring-green-500"
        />
        {completed ? "完了済み" : "未完了"}
      </label>
      <div className="mt-0.5 flex gap-2">
        <button
          onClick={() => router.push(`/plans/${planId}/edit`)}
          className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
        >
          編集
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
        >
          削除
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteModal}
        title="プランを削除しますか？"
        description="この操作は取り消せません。"
        confirmLabel={isSubmitting ? "削除中..." : "削除する"}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
