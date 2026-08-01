// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/contexts/toast-context";
import { PlanLoadMoreList } from "@/components/plans/PlanLoadMoreList";
import type { Plan } from "@/types/plan";

vi.mock("@/components/plans/PlanActions", () => ({
  PlanActions: () => null,
}));

function renderWithToast(component: React.ReactNode) {
  return render(<ToastProvider>{component}</ToastProvider>);
}

function makePlan(id: string, title: string): Plan {
  return {
    id,
    title,
    startDate: null,
    endDate: null,
    budget: null,
    budgetBreakdown: null,
    memo: null,
    completed: false,
    userId: "user-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 0,
  };
}

// IntersectionObserver をテスト環境向けに簡易実装し、observe直後に isIntersecting: true を発火させる
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly scrollMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback([{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

describe("PlanLoadMoreList（GATE-22種類B: 継続取得の共通UI導線）", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hasMoreがfalse_継続取得のfetchが発生しない", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <PlanLoadMoreList
        initialPlans={[makePlan("plan-1", "プランA")]}
        initialNextCursor={null}
        initialHasMore={false}
        baseUrl="/api/mypage/plans/active"
      />
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sentinelが表示範囲に入る_追加取得したプランが末尾に追記されカーソルとhasMoreが更新される", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plans: [makePlan("plan-2", "プランB")], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <PlanLoadMoreList
        initialPlans={[makePlan("plan-1", "プランA")]}
        initialNextCursor="plan-1"
        initialHasMore={true}
        baseUrl="/api/mypage/plans/active"
      />
    );

    await waitFor(() => expect(screen.getByText("プランB")).toBeInTheDocument());
    expect(screen.getByText("プランA")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/mypage/plans/active?cursor=plan-1");
  });

  it("baseUrlに既存のクエリがある場合_区切り文字に&を使ってcursorを付与する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ plans: [], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <PlanLoadMoreList
        initialPlans={[makePlan("plan-1", "プランA")]}
        initialNextCursor="plan-1"
        initialHasMore={true}
        baseUrl="/api/mypage/plans/completed?year=2026"
      />
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/mypage/plans/completed?year=2026&cursor=plan-1")
    );
  });

  it("API失敗時_エラートーストを表示し既存の一覧は変化しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderWithToast(
      <PlanLoadMoreList
        initialPlans={[makePlan("plan-1", "プランA")]}
        initialNextCursor="plan-1"
        initialHasMore={true}
        baseUrl="/api/mypage/plans/active"
      />
    );

    await waitFor(() => expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument());
    expect(screen.getByText("プランA")).toBeInTheDocument();
    // hasMoreが変わらず失敗し続けるため、sentinelが再試行し続ける前に明示的にアンマウントする
    unmount();
  });
});
