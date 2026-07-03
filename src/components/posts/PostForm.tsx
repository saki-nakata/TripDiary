"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/contexts/toast-context";
import { StarRating } from "./StarRating";
import { CATEGORIES, PREFECTURES } from "@/lib/constants";
import { postSchema, type PostInput } from "@/lib/validations/post";
import type { Post, CostBreakdownItem } from "@/types/post";
import { useState } from "react";

type Props = {
  initialData?: Post;
  planId?: string;
};

function formatAmount(value: number): string {
  if (!value) return "";
  return value.toLocaleString("ja-JP");
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}

export function PostForm({ initialData, planId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = !!initialData;

  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>(
    initialData?.costBreakdown ?? []
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PostInput>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      body: initialData?.body ?? "",
      prefecture: initialData?.prefecture ?? "",
      category: (initialData?.category as PostInput["category"]) ?? undefined,
      rating: initialData?.rating ?? undefined,
      visitedAt: initialData?.visitedAt ? initialData.visitedAt.slice(0, 10) : "",
      lat: initialData?.lat ?? null,
      lng: initialData?.lng ?? null,
      planId: planId ?? initialData?.planId ?? null,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const titleValue = watch("title") ?? "";
  const bodyValue = watch("body") ?? "";
  const totalCost = costBreakdown.reduce((sum, item) => sum + item.amount, 0);

  function addCostItem() {
    setCostBreakdown([...costBreakdown, { label: "", amount: 0 }]);
  }

  function updateCostItem(index: number, field: keyof CostBreakdownItem, value: string | number) {
    setCostBreakdown(
      costBreakdown.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeCostItem(index: number) {
    setCostBreakdown(costBreakdown.filter((_, i) => i !== index));
  }

  async function onSubmit(data: PostInput) {
    const payload = {
      ...data,
      costBreakdown: costBreakdown.filter((i) => i.label.trim()),
    };

    try {
      const url = isEdit ? `/api/posts/${initialData!.id}` : "/api/posts";
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

      showToast(isEdit ? "投稿を更新しました" : "投稿しました！");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "エラーが発生しました", "error");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl mx-auto">

        {/* スポット名 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-base font-bold text-zinc-700">
              スポット名 <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-zinc-400">{titleValue.length} / 40 文字</span>
          </div>
          <input
            {...register("title")}
            maxLength={40}
            placeholder="例：金閣寺"
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.title ? "border-red-400" : "border-zinc-200"}`}
          />
          {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
        </div>

        {/* 感想・メモ */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-base font-bold text-zinc-700">
              感想・メモ <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-zinc-400">{bodyValue.length} / 2000 文字</span>
          </div>
          <textarea
            {...register("body")}
            maxLength={2000}
            rows={5}
            placeholder="旅の思い出を書いてみましょう..."
            className={`w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.body ? "border-red-400" : "border-zinc-200"}`}
          />
          {errors.body && <p className="text-xs text-red-500">{errors.body.message}</p>}
        </div>

        {/* 写真 */}
        <div className="space-y-1">
          <label className="text-base font-bold text-zinc-700">写真</label>
          <div className="w-full h-28 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center text-sm text-zinc-400">
            📷 写真アップロードは今後実装予定です
          </div>
        </div>

        {/* 訪問日・エリア */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-base font-bold text-zinc-700">
              訪問日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register("visitedAt")}
              max={new Date().toISOString().slice(0, 10)}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.visitedAt ? "border-red-400" : "border-zinc-200"}`}
            />
            {errors.visitedAt && <p className="text-xs text-red-500">{errors.visitedAt.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-base font-bold text-zinc-700">
              エリア <span className="text-red-500">*</span>
            </label>
            <select
              {...register("prefecture")}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${errors.prefecture ? "border-red-400" : "border-zinc-200"}`}
            >
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.prefecture && <p className="text-xs text-red-500">{errors.prefecture.message}</p>}
          </div>
        </div>

        {/* カテゴリ・評価 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-base font-bold text-zinc-700">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              {...register("category")}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${errors.category ? "border-red-400" : "border-zinc-200"}`}
            >
              <option value="">選択してください</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-base font-bold text-zinc-700">評価</label>
            <div className="pl-2">
              <Controller
                name="rating"
                control={control}
                render={({ field }) => (
                  <StarRating value={field.value ?? 0} onChange={field.onChange} size="lg" />
                )}
              />
            </div>
          </div>
        </div>

        {/* 費用内訳 */}
        <div className="space-y-2">
          <label className="block text-base font-bold text-zinc-700">費用内訳（自分のみ表示）</label>
          {totalCost > 0 && (
            <p className="text-sm font-semibold text-zinc-700 mb-3">合計：¥{totalCost.toLocaleString()}</p>
          )}
          {costBreakdown.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={formatAmount(item.amount)}
                onChange={(e) => updateCostItem(i, "amount", parseAmount(e.target.value))}
                placeholder="金額"
                className="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                value={item.label}
                onChange={(e) => updateCostItem(i, "label", e.target.value)}
                placeholder="内容（例：交通費）"
                maxLength={50}
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={() => removeCostItem(i)}
                className="rounded-lg border border-zinc-200 px-2 py-2 text-sm text-zinc-400 hover:text-red-500 hover:border-red-300 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addCostItem}
            className="w-40 py-2 rounded-lg border border-dashed border-zinc-300 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            ＋ 項目を追加
          </button>
        </div>

        {/* 地図（今後実装予定） */}
        <div className="space-y-2">
          <label className="block text-base font-bold text-zinc-700">📍 場所・地図</label>
          <div className="w-full h-44 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col items-center justify-center gap-2 text-zinc-400">
            <span className="text-3xl">🗺️</span>
            <span className="text-sm">地図機能は今後実装予定です</span>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="flex gap-3 pt-2 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-zinc-400 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:border-zinc-500 hover:text-zinc-800 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "送信中..." : isEdit ? "更新する" : "投稿する"}
          </button>
        </div>
      </form>
    </>
  );
}
