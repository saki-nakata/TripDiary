// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyPostActions } from "@/components/posts/MyPostActions";
import { ToastProvider } from "@/contexts/toast-context";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

function renderActions() {
  render(
    <ToastProvider><MyPostActions postId="post-1" /></ToastProvider>
  );
}

describe("MyPostActions（第4ラウンドレビューB-2: 通信例外のハンドリング）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    refreshMock.mockClear();
  });

  it("fetch自体が例外を投げる_エラートーストを表示しローディング状態が解除される", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network error")));

    renderActions();
    const user = userEvent.setup();
    await user.click(screen.getByTitle("削除"));
    await user.click(screen.getByText("削除する"));

    expect(await screen.findByText("削除に失敗しました")).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
