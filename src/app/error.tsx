"use client";

import { useEffect } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <TwemojiIcon codepoint="26a0" className="h-12 w-12" />
      <h2 className="text-xl font-semibold text-zinc-800">エラーが発生しました</h2>
      <p className="text-sm text-zinc-500">しばらく経ってからもう一度お試しください。</p>
      <button
        onClick={reset}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        再試行する
      </button>
    </div>
  );
}
