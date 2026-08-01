"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useToast } from "@/contexts/toast-context";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { PlanActions } from "@/components/plans/PlanActions";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { formatDateSlash } from "@/lib/date";
import type { Plan } from "@/types/plan";

type Props = {
  initialPlans: Plan[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  /** cursorを除いた継続取得用のURL（例: "/api/mypage/plans/completed?year=2026"）。cursorはこのコンポーネントが付与する */
  baseUrl: string;
};

// マイページ「旅行プラン」タブの進行中／完了済み一覧で共通利用する無限スクロール導線（GATE-22種類B）。
// Server Componentが取得した初回ページを受け取り、末尾のsentinelが表示範囲に入るたびにcursorで継続取得してリストへ追記する
export function PlanLoadMoreList({ initialPlans, initialNextCursor, initialHasMore, baseUrl }: Props) {
  const [plans, setPlans] = useState(initialPlans);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const res = await fetch(`${baseUrl}${separator}cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) {
        showToast("読み込みに失敗しました", "error");
        return;
      }
      const data: { plans: Plan[]; nextCursor: string | null; hasMore: boolean } = await res.json();
      setPlans((prev) => [...prev, ...data.plans]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      showToast("読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading, baseUrl]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  return (
    <div>
      <div className="space-y-2">
        {plans.map((plan) => (
          <PlanListItem key={plan.id} plan={plan} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center mt-4 py-2">
          {loading && <span className="text-sm text-zinc-400">読み込み中...</span>}
        </div>
      )}
    </div>
  );
}

function PlanListItem({ plan }: { plan: Plan }) {
  return (
    <div className="group flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-100">
      <Link href={`/plans/${plan.id}`} className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-base font-bold text-zinc-800">
          <TwemojiIcon codepoint="1f9ed" alt="🧭" className="h-5 w-5 shrink-0" /> {plan.title}
        </p>
        {(plan.startDate || plan.endDate) && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-400">
            <TwemojiIcon codepoint="1f4c5" alt="📅" className="h-3 w-3" />
            {plan.startDate ? formatDateSlash(plan.startDate) : "未定"} 〜 {plan.endDate ? formatDateSlash(plan.endDate) : "未定"}
          </p>
        )}
        {plan.memo && <p className="mt-1 truncate text-[13px] text-zinc-500">{plan.memo}</p>}
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[13px] font-semibold text-zinc-500">{plan.spotCount ?? 0}スポット</span>
        <div className="opacity-100 xl:opacity-0 transition-opacity xl:group-hover:opacity-100">
          <PlanActions planId={plan.id} completed={plan.completed} version={plan.version} variant="icons" />
        </div>
      </div>
    </div>
  );
}
