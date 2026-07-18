"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/contexts/toast-context";
import { StarRating } from "./StarRating";
import { DateField } from "./DateField";
import { LocationPickerWrapper } from "@/components/map/LocationPickerWrapper";
import { CATEGORIES, CATEGORY_ICONS, LOCATIONS } from "@/lib/constants";
import { postSchema, type PostInput } from "@/lib/validations/post";
import type { Post, CostBreakdownItem } from "@/types/post";
import { useState, useRef } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { useQueryClient } from "@tanstack/react-query";
import type { PortalFeedData } from "@/components/explore/ExploreFeed";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableImageThumb({
  url,
  index,
  draggable,
  onRemove,
}: {
  url: string;
  index: number;
  draggable: boolean;
  onRemove: (url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={`relative group ${draggable ? "cursor-grab touch-none active:cursor-grabbing" : ""} ${isDragging ? "opacity-50 z-10" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`写真 ${index + 1}`}
        className="w-20 h-20 object-cover rounded-lg border border-zinc-200"
      />
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(url)}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white shadow rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <TwemojiIcon codepoint="274c" alt="削除" className="h-3 w-3" />
      </button>
    </div>
  );
}

type Props = {
  initialData?: Post;
  planId?: string;
  presetTitle?: string;
  presetLocation?: string;
  presetCategory?: string;
  presetImageUrl?: string;
};

function formatAmount(value: number): string {
  if (!value) return "";
  return value.toLocaleString("ja-JP");
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, "")) || 0;
}

export function PostForm({ initialData, planId, presetTitle, presetLocation, presetCategory, presetImageUrl }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!initialData;

  const [costBreakdown, setCostBreakdown] = useState<CostBreakdownItem[]>(
    initialData?.costBreakdown ?? []
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialData?.images?.map((img) => img.url) ?? (presetImageUrl ? [presetImageUrl] : [])
  );
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
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
      title: initialData?.title ?? presetTitle ?? "",
      body: initialData?.body ?? "",
      location: initialData?.location ?? presetLocation ?? "",
      category: (initialData?.category as PostInput["category"]) ?? (presetCategory as PostInput["category"]) ?? undefined,
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

  function handleImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImageUrls((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;

    setUploadingCount((c) => c + files.length);
    const uploaded: string[] = [];

    await Promise.all(
      files.map(async (file) => {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload/post", { method: "POST", body: form });
        if (res.ok) {
          const { url } = await res.json();
          uploaded.push(url);
        } else {
          const err = await res.json();
          showToast(err.error ?? "アップロードに失敗しました", "error");
        }
        setUploadingCount((c) => c - 1);
      })
    );

    setImageUrls((prev) => [...prev, ...uploaded]);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    await uploadFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    await uploadFiles(files);
  }

  async function onSubmit(data: PostInput) {
    const payload = {
      ...data,
      imageUrls,
      costBreakdown: costBreakdown.filter((i) => i.amount > 0),
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

      if (isEdit) {
        await queryClient.invalidateQueries({ queryKey: ["explore-feed"] });
        router.push("/mypage?tab=myposts");
        router.refresh();
      } else {
        const created: Post = await res.json();
        queryClient.setQueryData<PortalFeedData>(["explore-feed"], (old) =>
          old ? { ...old, latest: [created, ...old.latest].slice(0, 6) } : old
        );
        if (planId) {
          router.push(`/plans/${planId}`);
        } else {
          router.push(`/?highlighted=${created.id}`);
        }
      }
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
            <span className={`text-xs ${titleValue.length > 40 ? "text-red-500" : "text-zinc-400"}`}>
              {titleValue.length} / 40 文字
            </span>
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
            <span className={`text-xs ${bodyValue.length > 2000 ? "text-red-500" : "text-zinc-400"}`}>
              {bodyValue.length} / 2000 文字
            </span>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-base font-bold text-zinc-700">写真</label>
            {imageUrls.length > 1 && (
              <p className="hidden sm:block text-xs text-zinc-400">（ドラッグ&ドロップで並び順を変更できます）</p>
            )}
          </div>
          {imageUrls.length > 0 && (
            <DndContext id="post-images" sensors={imageSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
              <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
                <div className="flex gap-2 flex-wrap">
                  {imageUrls.map((url, i) => (
                    <SortableImageThumb
                      key={url}
                      url={url}
                      index={i}
                      draggable={imageUrls.length > 1}
                      onRemove={(u) => setImageUrls((prev) => prev.filter((x) => x !== u))}
                    />
                  ))}
                  {uploadingCount > 0 && (
                    <div className="w-20 h-20 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center text-xs text-zinc-400">
                      uploading…
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <label
            className={`w-full h-14 rounded-xl border border-dashed flex items-center justify-center text-sm cursor-pointer transition-colors ${
              isDragging
                ? "border-green-500 bg-green-50 text-green-600"
                : "border-zinc-300 bg-zinc-50 text-zinc-400 hover:bg-zinc-100"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {uploadingCount > 0 ? (
              "アップロード中…"
            ) : isDragging ? (
              "📷 ここにドロップして追加"
            ) : (
              <>
                <span className="sm:hidden">📷 クリックで写真を追加</span>
                <span className="hidden sm:inline">📷 クリックまたはドラッグ&ドロップで写真を追加</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          <p className="text-xs text-zinc-400">JPEG・PNG・WebP・GIF、各10MB以内、複数選択可</p>
        </div>

        {/* 訪問日・エリア */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-base font-bold text-zinc-700">
              訪問日 <span className="text-red-500">*</span>
            </label>
            <Controller
              name="visitedAt"
              control={control}
              render={({ field }) => (
                <DateField
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  max={new Date().toISOString().slice(0, 10)}
                  error={!!errors.visitedAt}
                />
              )}
            />
            {errors.visitedAt && <p className="text-xs text-red-500">{errors.visitedAt.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-base font-bold text-zinc-700">
              エリア <span className="text-red-500">*</span>
            </label>
            <select
              {...register("location")}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white ${errors.location ? "border-red-400" : "border-zinc-200"}`}
            >
              <option value="">選択してください</option>
              {LOCATIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
          </div>
        </div>

        {/* カテゴリ・評価 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
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
        <div className="space-y-2 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <label className="block text-base font-bold text-zinc-700">費用内訳</label>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5">
              🔒 自分のみ表示
            </span>
          </div>
          <div className="flex items-center justify-between pr-4 mb-1">
            <p className="text-sm font-semibold text-zinc-700">
              合計：{totalCost > 0 ? `¥${totalCost.toLocaleString()}` : "—"}
            </p>
            <button
              type="button"
              onClick={addCostItem}
              className="py-2 px-4 rounded-lg border border-dashed border-zinc-300 text-sm font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              ＋ 項目を追加
            </button>
          </div>
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
                className="px-2 py-2 text-zinc-400 hover:text-red-500 transition-colors"
              >
                <TwemojiIcon codepoint="274c" alt="削除" className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* 地図 */}
        <div className="space-y-2">
          <Controller
            name="lat"
            control={control}
            render={({ field: latField }) => (
              <Controller
                name="lng"
                control={control}
                render={({ field: lngField }) => (
                  <LocationPickerWrapper
                    lat={latField.value ?? null}
                    lng={lngField.value ?? null}
                    onChange={(lat, lng) => {
                      latField.onChange(lat);
                      lngField.onChange(lng);
                    }}
                    label="📍 地図（任意）"
                  />
                )}
              />
            )}
          />
        </div>

        {/* 送信ボタン */}
        <div className="flex gap-6 pt-2 max-w-md mx-auto">
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
