// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/contexts/toast-context";
import { PlanLoadMoreList } from "@/components/plans/PlanLoadMoreList";
import type { Plan } from "@/types/plan";

vi.mock("@/components/plans/PlanActions", () => ({
  PlanActions: () => null,
}));

function renderWithToast(component: React.ReactNode) {
  render(<ToastProvider>{component}</ToastProvider>);
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
  };
}

describe("PlanLoadMoreList（GATE-22種類B: 継続取得の共通UI導線）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hasMoreがfalse_もっと見るボタンが表示されない", () => {
    renderWithToast(
      <PlanLoadMoreList
        initialPlans={[makePlan("plan-1", "プランA")]}
        initialNextCursor={null}
        initialHasMore={false}
        baseUrl="/api/mypage/plans/active"
      />
    );

    expect(screen.queryByRole("button", { name: "もっと見る" })).not.toBeInTheDocument();
  });

  it("もっと見るをクリック_追加取得したプランが末尾に追記されカーソルとhasMoreが更新される", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "もっと見る" }));

    await waitFor(() => expect(screen.getByText("プランB")).toBeInTheDocument());
    expect(screen.getByText("プランA")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/mypage/plans/active?cursor=plan-1");
    expect(screen.queryByRole("button", { name: "もっと見る" })).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "もっと見る" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/mypage/plans/completed?year=2026&cursor=plan-1")
    );
  });

  it("API失敗時_エラートーストを表示し既存の一覧は変化しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <PlanLoadMoreList
        initialPlans={[makePlan("plan-1", "プランA")]}
        initialNextCursor="plan-1"
        initialHasMore={true}
        baseUrl="/api/mypage/plans/active"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "もっと見る" }));

    await waitFor(() => expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "もっと見る" })).toBeInTheDocument();
  });
});
