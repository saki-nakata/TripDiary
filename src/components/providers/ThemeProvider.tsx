"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { applyTheme, type ThemeChoice } from "@/components/ui/theme";
import { parseThemeCookie, buildThemeCookieStringForClient } from "@/lib/theme-cookie";

type ThemeContextValue = {
  choice: ThemeChoice;
  select: (next: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// 連続クリック時に最終選択だけをDBへ保存する（PATCH呼び出しの直列化の代わりにデバウンス、DR-02追記どおり）
const PATCH_DEBOUNCE_MS = 400;

function readThemeCookieClient(): ThemeChoice {
  const match = document.cookie.match(/(?:^|; )theme=([^;]*)/);
  return parseThemeCookie(match ? decodeURIComponent(match[1]) : undefined);
}

/**
 * RootLayoutが解決済みの値（Cookie/DBのどちらが正かはpersistで決まる）を受け取り、
 * 配下のThemeToggle/ThemeMenuButtonへ`useTheme()`経由で配る。呼び出し箇所ごとに
 * persistを配線する代わりに、RootLayoutがセッション有無から一括で決定した値をここで受ける。
 */
export function ThemeProvider({
  initial,
  persist,
  children,
}: {
  initial: ThemeChoice;
  persist: "cookie" | "api";
  children: ReactNode;
}) {
  const [choice, setChoice] = useState<ThemeChoice>(initial);
  const [saveError, setSaveError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // ログイン済み（DBが正）で端末Cookieが古い場合にミラーする。未ログインはCookie自体が
    // 正のため比較不要（persist==="cookie"ではselect()の書き込みだけで十分）
    if (persist !== "api") return;
    if (readThemeCookieClient() === initial) return;
    document.cookie = buildThemeCookieStringForClient(initial, location.protocol === "https:");
  }, [persist, initial]);

  function select(next: ThemeChoice) {
    setChoice(next);
    applyTheme(next);
    setSaveError(false);

    if (persist === "cookie") {
      document.cookie = buildThemeCookieStringForClient(next, location.protocol === "https:");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetch("/api/me/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      })
        .then((res) => {
          if (!res.ok) setSaveError(true);
        })
        .catch(() => setSaveError(true));
    }, PATCH_DEBOUNCE_MS);
  }

  return (
    <ThemeContext.Provider value={{ choice, select }}>
      {children}
      {saveError && (
        <div
          role="alert"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600 shadow-md dark:bg-red-950 dark:border-red-900 dark:text-red-300"
        >
          テーマ設定を保存できませんでした。表示には一時的に反映されています。
        </div>
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
