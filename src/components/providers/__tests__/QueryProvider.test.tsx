// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/contexts/toast-context";

function FailingQuery({ message, silent }: { message: string; silent?: boolean }) {
  useQuery({
    queryKey: ["failing-query", message],
    queryFn: () => Promise.reject(new Error(message)),
    retry: false,
    meta: silent ? { silentError: true } : undefined,
  });
  return null;
}

describe("QueryProvider", () => {
  it("queryFnが失敗した場合_エラーメッセージがトーストとして表示される", async () => {
    render(
      <QueryProvider>
        <ToastProvider>
          <FailingQuery message="読み込みに失敗しました（テスト）" />
        </ToastProvider>
      </QueryProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("toast")).toHaveTextContent("読み込みに失敗しました（テスト）");
    });
  });

  it("meta.silentErrorがtrueの場合_トーストを表示しない", async () => {
    render(
      <QueryProvider>
        <ToastProvider>
          <FailingQuery message="サイレント失敗（テスト）" silent />
        </ToastProvider>
      </QueryProvider>
    );

    // 非同期のqueryFn失敗が伝播する時間を確保してから、トーストが出ていないことを確認する
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByTestId("toast")).not.toBeInTheDocument();
  });

  it("ToastProviderがマウントされていない場合でもエラーを投げずに無視される", async () => {
    render(
      <QueryProvider>
        <FailingQuery message="ToastProvider未マウント時の失敗（テスト）" />
      </QueryProvider>
    );

    // 登録済みのshowGlobalToastが無い状態でonErrorが呼ばれても例外を投げないことを確認する
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
