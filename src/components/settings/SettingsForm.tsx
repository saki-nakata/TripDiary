"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/contexts/toast-context";
import { userUpdateSchema, type UserUpdateInput } from "@/lib/validations/user";

type Props = {
  userId: string;
  initialNickname: string;
  initialBio: string | null;
  initialImage: string | null;
};

export function SettingsForm({ userId, initialNickname, initialBio, initialImage }: Props) {
  const router = useRouter();
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
    defaultValues: { nickname: initialNickname, bio: initialBio ?? "" },
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
      if (!res.ok) throw new Error();

      showToast("プロフィールを更新しました", "success");
      router.push(`/users/${userId}`);
    } catch {
      showToast("エラーが発生しました", "error");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden bg-zinc-200 shrink-0">
          {image ? (
            <Image src={image} alt="アイコン" fill sizes="100px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-500 font-medium">
              {initialNickname[0]}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-700 mb-1">プロフィール画像</p>
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
            className="cursor-pointer px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            {uploading ? "アップロード中..." : "画像を変更"}
          </label>
          <p className="text-xs text-zinc-400 mt-1">JPEG・PNG・WebP、5MB以内</p>
        </div>
      </div>

      {/* Nickname */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-sm font-semibold text-zinc-700">
            ニックネーム <span className="text-red-500">*</span>
          </label>
          <span className={`text-xs ${nicknameValue.length > 20 ? "text-red-500" : "text-zinc-400"}`}>
            {nicknameValue.length} / 20 文字
          </span>
        </div>
        <input
          {...register("nickname")}
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
        />
        {errors.nickname && <p className="text-xs text-red-500 mt-1">{errors.nickname.message}</p>}
      </div>

      {/* Bio */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <label className="text-sm font-semibold text-zinc-700">自己紹介</label>
          <span className={`text-xs ${bioValue.length > 200 ? "text-red-500" : "text-zinc-400"}`}>
            {bioValue.length} / 200 文字
          </span>
        </div>
        <textarea
          {...register("bio")}
          rows={5}
          placeholder="旅の趣味や好きな場所を教えてください"
          className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
        />
        {errors.bio && <p className="text-xs text-red-500 mt-1">{errors.bio.message}</p>}
      </div>

      <div className="flex justify-center gap-6">
        <Link
          href={`/users/${userId}`}
          className="px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-semibold hover:bg-zinc-50 transition-colors"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="px-5 py-2.5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors disabled:opacity-50"
        >
          保存する
        </button>
      </div>
    </form>
  );
}
