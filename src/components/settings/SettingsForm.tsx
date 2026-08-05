"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/contexts/toast-context";
import { userUpdateSchema, type UserUpdateInput } from "@/lib/validations/user";

type Props = {
  userId: string;
  initialNickname: string;
  initialBio: string | null;
  initialImage: string | null;
  initialVersion: number;
};

export function SettingsForm({ userId, initialNickname, initialBio, initialImage, initialVersion }: Props) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(initialImage);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserUpdateInput>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: { nickname: initialNickname, bio: initialBio ?? "", version: initialVersion },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const bioValue = watch("bio") ?? "";
  const nicknameValue = watch("nickname") ?? "";

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/avatar", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(typeof err.error === "string" ? err.error : "アップロードに失敗しました");
      }
      const { url } = await res.json();
      setImage(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "アップロードに失敗しました", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSubmit(data: UserUpdateInput) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, image }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "エラーが発生しました");
      }

      showToast("プロフィールを更新しました", "success");
      // Sidebarが常にプロフィールへのLinkを描画しておりNext.jsが編集前のRSC payloadを
      // prefetchし得るため、router.pushではキャッシュされた古い内容が一瞬表示されることがある
      // （Terraの調査、更新直後にキャッシュ無効化を伴わないため）。完全なdocument navigationで
      // 確実に最新のサーバー応答を取得する（ログイン・新規登録直後と同じ方式）
      window.location.assign(`/users/${userId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "エラーが発生しました", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0">
          {image ? (
            <Image src={image} alt="アイコン" fill sizes="100px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-500 dark:text-zinc-300 font-medium">
              {initialNickname[0]}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-surface-foreground mb-1">プロフィール画像</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
            id="avatar-input"
          />
          <label
            htmlFor="avatar-input"
            className="cursor-pointer px-4 py-2 rounded-lg border border-surface-border text-sm font-medium hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
          >
            {uploading ? "アップロード中..." : "画像を変更"}
          </label>
          <p className="text-xs text-zinc-400 mt-1">JPEG・PNG・WebP、5MB以内</p>
        </div>
      </div>

      {/* Nickname */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-sm font-semibold text-surface-foreground">
            ニックネーム <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs ${nicknameValue.length > 20 ? "text-red-500" : "text-zinc-400"}`}>
            {nicknameValue.length} / 20 文字
          </span>
        </div>
        <input
          {...register("nickname")}
          className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm bg-surface text-surface-foreground focus:outline-none focus:ring-2 focus:ring-green-700"
        />
        {errors.nickname && <p className="text-xs text-red-500 mt-1">{errors.nickname.message}</p>}
      </div>

      {/* Bio */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-sm font-semibold text-surface-foreground">自己紹介</label>
          <span className={`text-xs ${bioValue.length > 200 ? "text-red-500" : "text-zinc-400"}`}>
            {bioValue.length} / 200 文字
          </span>
        </div>
        <textarea
          {...register("bio")}
          rows={5}
          placeholder="旅の趣味や好きな場所を教えてください"
          className="w-full border border-surface-border rounded-lg px-3 py-2 text-sm bg-surface text-surface-foreground placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-700"
        />
        {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
      </div>

      <div className="flex justify-center gap-6">
        <Link
          href={`/users/${userId}`}
          className="px-5 py-2.5 rounded-xl border border-surface-border text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="px-5 py-2.5 rounded-xl bg-[#15803d] text-white text-sm font-semibold hover:bg-[#166534] transition-colors disabled:opacity-50"
        >
          保存する
        </button>
      </div>
    </form>
  );
}
