"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { planSchema, type PlanInput } from "@/lib/validations/plan";
import { SpotPicker, type SelectedSpot } from "./SpotPicker";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { DateField } from "@/components/posts/DateField";
import type { PlanDetail, PlanSpotPost, PlanSpotInput, BudgetBreakdownItem } from "@/types/plan";

type Props = {
  initialData?: PlanDetail;
  wishlistPosts: PlanSpotPost[];
};

function formatAmount(value: number): string {
  if (!value) return "";
  return value.toLocaleString("ja-JP");
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}

export function PlanForm({ initialData, wishlistPosts }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = !!initialData;

  const [completed, setCompleted] = useState(initialData?.completed ?? false);
  const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetBreakdownItem[]>(
    initialData?.budgetBreakdown ?? []
  );
  const [spots, setSpots] = useState<PlanSpotInput[]>(
    initialData?.spots.map((s) =>
      s.post
        ? { type: "post", postId: s.post.id }
        : { type: "free", title: s.freeTitle ?? "", location: s.freeLocation ?? "", category: s.freeCategory }
    ) ?? []
  );
  const initialSelectedSpots: SelectedSpot[] =
    initialData?.spots.map((s, i) =>
      s.post
        ? { ...s.post, kind: "post" as const }
        : {
            kind: "free" as const,
            id: `free-${i}`,
            title: s.freeTitle ?? "",
            location: s.freeLocation,
            category: s.freeCategory,
          }
    ) ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlanInput>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      startDate: initialData?.startDate ? initialData.startDate.slice(0, 10) : "",
      endDate: initialData?.endDate ? initialData.endDate.slice(0, 10) : "",
      memo: initialData?.memo ?? "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const titleValue = watch("title") ?? "";
  const totalBudget = budgetBreakdown.reduce((sum, item) => sum + item.amount, 0);

  function addBudgetItem() {
    setBudgetBreakdown([...budgetBreakdown, { label: "", amount: 0 }]);
  }

  function updateBudgetItem(index: number, field: "label" | "amount", value: string | number) {
    setBudgetBreakdown(
      budgetBreakdown.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeBudgetItem(index: number) {
    setBudgetBreakdown(budgetBreakdown.filter((_, i) => i !== index));
  }

  async function onSubmit(data: PlanInput) {
    const payload = {
      ...data,
      budgetBreakdown: budgetBreakdown.filter((i) => i.amount > 0 || i.label.trim() !== ""),
      spots,
    };

    try {
      const url = isEdit ? `/api/plans/${initialData!.id}` : "/api/plans";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "エラーが発生しました");
      }

      if (isEdit && completed !== initialData!.completed) {
        await fetch(`/api/plans/${initialData!.id}/complete`, { method: "PATCH" });
      }

      const saved = await res.json();
      showToast(isEdit ? "プランを更新しました" : "プランを作成しました");
      router.push(`/plans/${saved.id}`);
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "エラーが発生しました", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl mx-auto">
      {/* タイトル */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-base font-bold text-zinc-700">
            タイトル <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs ${titleValue.length > 60 ? "text-red-500" : "text-zinc-400"}`}>
            {titleValue.length} / 60 文字
          </span>
        </div>
        <input
          {...register("title")}
          maxLength={60}
          placeholder="例：京都・奈良 2泊3日"
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.title ? "border-red-400" : "border-zinc-200"}`}
        />
        {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
      </div>

      {/* 日程 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-base font-bold text-zinc-700">出発日</label>
          <Controller
            name="startDate"
            control={control}
            render={({ field }) => (
              <DateField value={field.value ?? ""} onChange={field.onChange} error={!!errors.startDate} />
            )}
          />
        </div>
        <div className="space-y-1">
          <label className="text-base font-bold text-zinc-700">帰着日</label>
          <Controller
            name="endDate"
            control={control}
            render={({ field }) => (
              <DateField value={field.value ?? ""} onChange={field.onChange} error={!!errors.endDate} />
            )}
          />
          {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
        </div>
      </div>

      {/* 予算内訳 */}
      <div className="space-y-1">
        <label className="block text-base font-bold text-zinc-700">予算</label>
        <div className="mb-1 flex items-center justify-between pr-4">
          <p className="text-sm font-semibold text-zinc-700">
            合計：{totalBudget > 0 ? `¥${totalBudget.toLocaleString()}` : "—"}
          </p>
          <button
            type="button"
            onClick={addBudgetItem}
            className="rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            ＋ 項目を追加
          </button>
        </div>
        {budgetBreakdown.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={formatAmount(item.amount)}
              onChange={(e) => updateBudgetItem(i, "amount", parseAmount(e.target.value))}
              placeholder="金額"
              className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              value={item.label}
              onChange={(e) => updateBudgetItem(i, "label", e.target.value)}
              placeholder="内容（例：交通費）"
              maxLength={50}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={() => removeBudgetItem(i)}
              className="px-2 py-2 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <TwemojiIcon codepoint="274c" alt="削除" className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* メモ */}
      <div className="space-y-1">
        <label className="text-base font-bold text-zinc-700">メモ</label>
        <textarea
          {...register("memo")}
          rows={4}
          placeholder="旅の目的やメモ"
          className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* スポット */}
      <div className="space-y-2">
        <label className="text-base font-bold text-zinc-700">スポット</label>
        <SpotPicker initialSelected={initialSelectedSpots} wishlistPosts={wishlistPosts} onChange={setSpots} />
      </div>

      {/* 完了ステータス（編集時のみ） */}
      {isEdit && (
        <div className="flex justify-center sm:justify-start gap-3 -mt-3">
          <button
            type="button"
            onClick={() => setCompleted(false)}
            className={`w-28 sm:w-auto sm:flex-1 rounded-full border px-4 py-2 text-sm font-semibold text-blue-700 transition-colors ${
              !completed ? "border-blue-500 bg-blue-50" : "border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            未完了
          </button>
          <button
            type="button"
            onClick={() => setCompleted(true)}
            className={`w-28 sm:w-auto sm:flex-1 rounded-full border px-4 py-2 text-sm font-semibold text-red-700 transition-colors ${
              completed ? "border-red-500 bg-red-50" : "border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            完了済み
          </button>
        </div>
      )}

      {/* 送信ボタン */}
      <div className="flex max-w-md mx-auto gap-6 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-zinc-400 py-3 text-sm font-medium text-zinc-600 hover:border-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "送信中..." : isEdit ? "更新する" : "作成する"}
        </button>
      </div>
    </form>
  );
}
