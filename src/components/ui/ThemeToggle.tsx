"use client";

import { THEME_OPTIONS } from "@/components/ui/theme";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle({
  className,
  compact = false,
  showLabels = false,
}: {
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
}) {
  const { choice, select } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="表示テーマ"
      // 区切り線はラベル表示の有無に関わらず常に付ける（アイコンのみの並びでも項目の境界を示すため）
      className={`${showLabels ? "flex w-full" : `inline-flex ${compact ? "text-[0.65rem]" : "text-[0.75rem]"}`} divide-x divide-surface-border rounded-lg border border-surface-border bg-surface p-0.5 ${className ?? ""}`}
    >
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={choice === opt.value}
          aria-label={`表示テーマ: ${opt.label}`}
          onClick={() => select(opt.value)}
          className={`rounded-md font-medium transition-colors ${showLabels ? "flex-1 flex flex-col items-center justify-center gap-0.5 px-2 py-1.5" : compact ? "px-1.5 py-0.5" : "px-2.5 py-1"} ${
            choice === opt.value
              ? "bg-[#dcfce7] text-[#14532d] dark:bg-[#14532d] dark:text-[#bbf7d0]"
              : "text-surface-foreground hover:bg-black/5 dark:hover:bg-white/10"
          }`}
        >
          {/* 絵文字はcompact指定の影響を受けず常に同じ大きさで表示する。ラベルのみcompact時に縮小する */}
          <span aria-hidden="true" className="text-base leading-none">{opt.emoji}</span>
          {showLabels && <span className={`leading-none ${compact ? "text-[0.65rem]" : "text-xs"}`}>{opt.label}</span>}
        </button>
      ))}
    </div>
  );
}
