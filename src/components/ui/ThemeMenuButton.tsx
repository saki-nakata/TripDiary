"use client";

import { useEffect, useRef, useState } from "react";
import { THEME_OPTIONS, useThemeChoice } from "@/components/ui/theme";

/**
 * 未ログインモバイル向け「現在テーマのアイコン1個＋選択メニュー」（2026-08-01決定）。
 * 常時3択を横並び表示する`ThemeToggle`と異なり、省スペースな1ボタン+ポップアップメニュー。
 */
export function ThemeMenuButton() {
  const { choice, select } = useThemeChoice();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = THEME_OPTIONS.find((opt) => opt.value === choice) ?? THEME_OPTIONS[2];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label={`表示テーマ（現在: ${current.label}）`}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center justify-center h-9 w-9 rounded-full text-[#64748b] dark:text-zinc-400 transition-colors"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          {current.emoji}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="表示テーマを選択"
          className="absolute top-full right-0 mt-2 w-32 bg-surface rounded-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-surface-border overflow-hidden z-50"
        >
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={choice === opt.value}
              onClick={() => { select(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                choice === opt.value
                  ? "bg-[#dcfce7] dark:bg-[#16a34a]/20 text-[#166534] dark:text-[#4ade80] font-semibold"
                  : "text-surface-foreground hover:bg-[#f8fafc] dark:hover:bg-white/5"
              }`}
            >
              <span aria-hidden="true">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
