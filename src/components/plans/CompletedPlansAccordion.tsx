"use client";

import { useLayoutEffect, useRef } from "react";

const STORAGE_KEY = "completedPlansAccordionOpen";

export function CompletedPlansAccordion({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useLayoutEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1" && ref.current) {
      ref.current.open = true;
    }
  }, []);

  return (
    <details
      ref={ref}
      className="group max-w-5xl rounded-xl border border-zinc-200"
      onToggle={(e) => {
        sessionStorage.setItem(STORAGE_KEY, (e.target as HTMLDetailsElement).open ? "1" : "0");
      }}
    >
      <summary className="flex list-none cursor-pointer items-center justify-between p-3 text-sm font-bold text-zinc-600 [&::-webkit-details-marker]:hidden">
        <span>✅ 完了済みの旅行プラン（{count}件）</span>
        <span className="text-zinc-400 transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="space-y-2 border-t border-zinc-200 p-3">{children}</div>
    </details>
  );
}
