"use client";

import { useLayoutEffect, useRef } from "react";

const STORAGE_KEY = "completedPlansAccordionOpen";

export function CompletedPlansAccordion({
  count,
  yearFilter,
  children,
}: {
  count: number;
  /** 完了済みプラン一覧の上に表示する年度切り替えUI（開いたときだけ見える） */
  yearFilter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useLayoutEffect(() => {
    // ストレージアクセスが例外を投げる環境（iPad SafariのIP直打ちアクセス等）では
    // 開閉状態の復元をスキップする
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1" && ref.current) {
        ref.current.open = true;
      }
    } catch {
      // no-op
    }
  }, []);

  return (
    <details
      ref={ref}
      className="group max-w-5xl rounded-xl border border-zinc-200"
      onToggle={(e) => {
        try {
          sessionStorage.setItem(STORAGE_KEY, (e.target as HTMLDetailsElement).open ? "1" : "0");
        } catch {
          // no-op
        }
      }}
    >
      <summary className="flex list-none cursor-pointer items-center justify-between p-3 text-sm font-bold text-zinc-600 [&::-webkit-details-marker]:hidden">
        <span>✅ 完了済みの旅行プラン（{count}件）</span>
        <span className="text-zinc-400 transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="space-y-3 border-t border-zinc-200 p-3">
        {yearFilter}
        <div className="space-y-2">{children}</div>
      </div>
    </details>
  );
}
