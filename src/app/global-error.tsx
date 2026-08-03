"use client";

import { useEffect } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { captureClientException } from "@/lib/monitoring-client";
import { applyTheme } from "@/components/ui/theme";
import { parseThemeCookie, THEME_COOKIE_NAME } from "@/lib/theme-cookie";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    // フロントエンドの致命的クラッシュを捕捉する唯一の箇所。
    // 監視SaaS導入時は captureClientException 内部の実装を差し替えるだけで反映される。
    // 現状はDSN未設定のためno-op。
    captureClientException(error, { source: "global-error" });
  }, [error]);

  useEffect(() => {
    // このページはルートレイアウトを経由しない独自の<html>のため、RootLayoutが
    // サーバー側で設定するdata-theme属性が付かない。アプリ内で手動選択したテーマ
    // （Cookie）をクライアント側で読み直し、prefers-color-schemeだけに頼らず反映する
    const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]*)`));
    applyTheme(parseThemeCookie(match ? decodeURIComponent(match[1]) : undefined));
  }, []);

  return (
    <html lang="ja">
      <body>
        <div className="animate-fade-in flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
            <TwemojiIcon codepoint="26a0" className="h-14 w-14" />
          </div>
          <h2 className="text-2xl font-semibold text-surface-foreground">重大な問題が発生しました</h2>
          <p className="max-w-sm text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
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
