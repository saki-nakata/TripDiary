// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanActions } from "@/components/plans/PlanActions";
import { ToastProvider } from "@/contexts/toast-context";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

function renderActions(completed: boolean, version: number) {
  render(
    <ToastProvider>
      <PlanActions planId="plan-1" completed={completed} version={version} />
    </ToastProvider>
  );
}

describe("PlanActions（DR-01: PATCH /completeの冪等set化とversion受け渡し）", () => {
  beforeEach(() => refreshMock.mockClear());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("未完了から完了へ切り替え_目標状態completed=trueと現在のversionを送る", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderActions(false, 4);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("plan-completed-checkbox"));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plans/plan-1/complete",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ completed: true, version: 4 }),
      })
    );
    expect(await screen.findByText("旅行を完了済みにしました")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalled();
  });

  it("version不一致で失敗_サーバーのエラーメッセージを表示する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "他の画面で更新されています。再読み込みしてください。" }),
      })
    );

    renderActions(false, 4);
    const user = userEvent.setup();
    await user.click(screen.getByTestId("plan-completed-checkbox"));

    expect(await screen.findByText("他の画面で更新されています。再読み込みしてください。")).toBeInTheDocument();
  });
});
