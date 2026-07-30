"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
import type { Plan } from "@/types/plan";

type Props = {
  initialPlans: Plan[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  /** cursorを除いた継続取得用のURL（例: "/api/mypage/plans/completed?year=2026"）。cursorはこのコンポーネントが付与する */
  baseUrl: string;
  render: (plans: Plan[]) => React.ReactNode;
};

// マイページ「旅行プラン」タブの進行中／完了済み一覧で共通利用する「もっと見る」導線（GATE-22種類B）。
// Server Componentが取得した初回ページを受け取り、クリックのたびにcursorで継続取得してリストへ追記する
export function PlanLoadMoreList({ initialPlans, initialNextCursor, initialHasMore, baseUrl, render }: Props) {
  const [plans, setPlans] = useState(initialPlans);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function loadMore() {
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
  }

  return (
    <div>
      {render(plans)}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}
