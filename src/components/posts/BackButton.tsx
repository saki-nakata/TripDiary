"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1 text-sm text-[#7ba7c4] border border-zinc-200 rounded-full px-2.5 py-1 transition-colors hover:bg-zinc-100 hover:border-zinc-300 hover:text-[#5a8aab]"
    >
      <span className="text-base leading-none">‹</span>
      <span>戻る</span>
    </button>
  );
}
