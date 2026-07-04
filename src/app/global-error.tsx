"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="ja">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-5xl">⚠️</p>
          <h2 className="text-xl font-semibold text-zinc-800">重大なエラーが発生しました</h2>
          <p className="text-sm text-zinc-500">しばらく経ってからもう一度お試しください。</p>
          <button
            onClick={reset}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            再試行する
          </button>
        </div>
      </body>
    </html>
  );
}
