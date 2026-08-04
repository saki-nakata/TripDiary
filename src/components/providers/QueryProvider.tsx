"use client";

import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { useState } from "react";
import { showGlobalToast } from "@/contexts/toast-context";

// meta.silentErrorを型安全に参照できるようにする（TanStack Query v5の推奨パターン）
declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { silentError?: boolean };
  }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        // 個々のqueryFnがthrowするErrorは、SearchClient/ExploreFeed等が個別にtry/catchせず
        // useQueryへ委ねている。ここで一箇所に集約してトースト表示することで、
        // コンポーネントごとの対応漏れ（無言で失敗する画面）を防ぐ。
        // 既にisError等で自前の代替表示（EmptyState等）を出すクエリでは、
        // meta.silentErrorをtrueにしてここでのトーストを抑制できる
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.meta?.silentError) return;
            showGlobalToast(error instanceof Error && error.message ? error.message : "読み込みに失敗しました");
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 300_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
