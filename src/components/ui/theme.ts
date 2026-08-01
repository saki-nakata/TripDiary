"use client";

import { useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

export const THEME_OPTIONS: { value: ThemeChoice; emoji: string; label: string }[] = [
  { value: "light", emoji: "☀️", label: "ライト" },
  { value: "dark", emoji: "🌙", label: "ダーク" },
  { value: "system", emoji: "🌗", label: "自動" },
];

export function applyTheme(choice: ThemeChoice) {
  if (choice === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", choice);
  }
}

/**
 * 現在の表示テーマ選択状態を読み書きする共有フック。
 * `ThemeToggle`（常時3択表示）と`ThemeMenuButton`（アイコン1個＋選択メニュー）の
 * 両方から使われ、ロジックの重複を避ける。
 */
export function useThemeChoice() {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        // マウント直後にlocalStorageの値をUIへ反映するための同期setStateであり、
        // カスケードレンダリングを起こす循環ではない
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChoiceState(stored);
      }
    } catch {
      // ストレージアクセス不可の環境では既定の「自動」のままにする
    }
  }, []);

  function select(next: ThemeChoice) {
    setChoiceState(next);
    // localStorageのuseEffectでの反映を待たず、クリック直後にReactの再レンダリングより
    // 先に見た目を切り替える（DR-02で決めた即時反映の要件）
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ストレージアクセス不可の環境でも見た目の切り替え自体は行う
    }
  }

  return { choice, select };
}
