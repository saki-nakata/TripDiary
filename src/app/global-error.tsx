"use client";

import { useEffect } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

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
        <div className="animate-fade-in flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-100">
            <TwemojiIcon codepoint="26a0" className="h-14 w-14" />
          </div>
          <h2 className="text-2xl font-semibold text-zinc-800">重大な問題が発生しました</h2>
          <p className="max-w-sm text-base leading-relaxed text-zinc-500">
            アプリの続行ができませんでした。
            <br />
            お手数ですが、再度お試しください。
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white hover:bg-red-700"
          >
            <TwemojiIcon codepoint="1f504" alt="🔄" className="h-5 w-5" /> 再試行する
          </button>
        </div>
      </body>
    </html>
  );
}
