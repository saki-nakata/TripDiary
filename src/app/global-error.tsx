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
    // ── エラー監視SaaS（Sentry等）連携ポイント（Phase 2.5-D） ──
    // フロントエンドの致命的クラッシュを捕捉する唯一の箇所。
    // 監視SaaS導入時はここに Sentry.captureException(error) 等を追加する。
    // 現状はDSN未設定のため console.error のみ。
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
