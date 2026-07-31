"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

function applyTheme(choice: ThemeChoice) {
  if (choice === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", choice);
  }
}

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
  { value: "system", label: "自動" },
];

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        // マウント直後にlocalStorageの値をUIへ反映するための同期setStateであり、
        // カスケードレンダリングを起こす循環ではない（Sidebar.tsxの同型パターンに合わせる）
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setChoice(stored);
      }
    } catch {
      // ストレージアクセス不可の環境では既定の「自動」のままにする
    }
  }, []);

  function handleSelect(next: ThemeChoice) {
    setChoice(next);
    // localStorageのuseEffectでの反映を待たず、クリック直後にReactの再レンダリングより
    // 先に見た目を切り替える（DR-02で決めた即時反映の要件）
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ストレージアクセス不可の環境でも見た目の切り替え自体は行う
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="配色モード"
      className={`inline-flex rounded-lg border border-surface-border bg-surface p-0.5 ${compact ? "text-[0.65rem]" : "text-[0.75rem]"} ${className ?? ""}`}
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={choice === opt.value}
          aria-label={`配色: ${opt.label}`}
          onClick={() => handleSelect(opt.value)}
          className={`rounded-md font-medium transition-colors ${compact ? "px-1.5 py-0.5" : "px-2.5 py-1"} ${
            choice === opt.value
              ? "bg-[#15803d] text-white"
              : "text-surface-foreground hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
