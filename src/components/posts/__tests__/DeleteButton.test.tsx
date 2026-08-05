// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { ToastProvider } from "@/contexts/toast-context";

function renderButton() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider><DeleteButton postId="post-1" /></ToastProvider>
    </QueryClientProvider>
  );
}

describe("DeleteButton（第4ラウンドレビューB-2: 通信例外のハンドリング）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetch自体が例外を投げる_エラートーストを表示しローディング状態が解除される", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network error")));

    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("delete-post-button"));
    await user.click(screen.getByText("削除する"));

    expect(await screen.findByText("削除に失敗しました")).toBeInTheDocument();
    // ローディング状態が解除されモーダルが閉じ、再度削除ボタンから操作可能であることを確認
    expect(screen.queryByText("削除する")).not.toBeInTheDocument();
    expect(screen.getByTestId("delete-post-button")).not.toBeDisabled();
  });
});
