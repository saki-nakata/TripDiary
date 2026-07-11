// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationList } from "@/components/notification/NotificationList";

const NOTIFICATIONS = [
  {
    id: "n1",
    type: "like",
    postId: "p1",
    commentBody: null,
    read: false,
    createdAt: new Date().toISOString(),
    fromUser: { id: "u1", nickname: "たろう", image: null },
  },
];

function renderWithClient() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <NotificationList />
    </QueryClientProvider>
  );
  return queryClient;
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
    this.callback(
      [{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry],
      this
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

describe("NotificationList", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ─── handleRead ───
  it("handleRead_既読API成功_既読バッジが消える", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: NOTIFICATIONS }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/いいねしました/)).toBeInTheDocument());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/notifications/n1/read", { method: "PATCH" }));
  });

  it("handleRead_既読API失敗_楽観的更新がロールバックされる", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ notifications: NOTIFICATIONS }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/いいねしました/)).toBeInTheDocument());
    // 既読PATCH（失敗）が呼ばれ、ロールバック処理まで完了するのを待つ
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
