"use client";

import { useEffect } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-6 py-32 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-amber-100">
        <TwemojiIcon codepoint="26a0" className="h-14 w-14" />
      </div>
      <h2 className="text-2xl font-semibold text-zinc-800">旅の途中で小さなトラブルが発生しました</h2>
      <p className="max-w-sm text-base leading-relaxed text-zinc-500">
        ご迷惑をおかけします。
        <br />
        もう一度お試しください。
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 rounded-lg bg-[#3B88C3] px-6 py-3 text-base font-medium text-white hover:bg-[#2f6ea3]"
      >
        <TwemojiIcon codepoint="1f504" alt="🔄" className="h-5 w-5" /> 再試行する
      </button>
    </div>
  );
}
