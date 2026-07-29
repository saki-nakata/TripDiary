// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanForm } from "@/components/plans/PlanForm";
import { ToastProvider } from "@/contexts/toast-context";
import type { PlanDetail } from "@/types/plan";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const backMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock, back: backMock }),
}));

const INITIAL_DATA: PlanDetail = {
  id: "plan-1",
  title: "既存のプラン",
  startDate: null,
  endDate: null,
  budget: null,
  budgetBreakdown: null,
  memo: null,
  completed: false,
  userId: "user-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 3,
  spots: [],
  linkedPosts: [],
};

function renderForm() {
  render(
    <ToastProvider>
      <PlanForm initialData={INITIAL_DATA} wishlistPosts={[]} />
    </ToastProvider>
  );
}

async function submit() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "更新する" }));
}

describe("PlanForm（GATE-21: PUT一本化・completed/version統合）", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("PUT失敗（version不一致409）_成功トースト・画面遷移をしない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "他の画面で更新されています。再読み込みしてください。" }),
      })
    );

    renderForm();
    await submit();

    expect(await screen.findByText("他の画面で更新されています。再読み込みしてください。")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByText("プランを更新しました")).not.toBeInTheDocument();
  });

  it("PUT成功_completed・versionが単一のPUTリクエストに統合され、別途PATCH /completeは呼ばれない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "plan-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderForm();
    await submit();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/plans/plan-1");
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.completed).toBe(false);
    expect(body.version).toBe(3);
    expect(pushMock).toHaveBeenCalledWith("/plans/plan-1");
  });
});
