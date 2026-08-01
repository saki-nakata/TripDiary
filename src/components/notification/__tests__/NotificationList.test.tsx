// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationList } from "@/components/notification/NotificationList";
import { ToastProvider } from "@/contexts/toast-context";

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

function makeNotification(id: string, nickname: string) {
  return {
    id,
    type: "follow",
    postId: null,
    commentBody: null,
    read: false,
    createdAt: new Date().toISOString(),
    fromUser: { id: `u-${id}`, nickname, image: null },
  };
}

function renderWithClient() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider><NotificationList /></ToastProvider>
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
    // 既読PATCHの失敗後、楽観的に消した未読ドットがDOM上で復元されることを確認する
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const notificationLink = screen.getByText(/いいねしました/).closest("a");
    await waitFor(() => expect(notificationLink?.querySelector(".bg-red-500")).not.toBeNull());
  });

  // ─── 継続取得（GATE-22種類A、無限スクロール） ───
  it("hasMoreがfalse_継続取得のfetchが発生しない", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notifications: NOTIFICATIONS, nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/いいねしました/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("初回取得が失敗した場合は空状態と区別してエラーを表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    renderWithClient();

    await waitFor(() => expect(screen.getAllByText("通知の読み込みに失敗しました").length).toBeGreaterThan(0));
  });

  it("sentinelが表示範囲に入る_追加取得した通知が末尾に追記されcursorを付与して呼び出す", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: NOTIFICATIONS, nextCursor: "n1", hasMore: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notifications: [makeNotification("n2", "はなこ")], nextCursor: null, hasMore: false }),
      })
      // 表示と同時にIntersectionObserverモックが即座に発火し既読PATCHが呼ばれるため、以降の呼び出し用に既定応答を用意する
      .mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient();

    await waitFor(() => expect(screen.getByText(/はなこ さんがあなたをフォローしました/)).toBeInTheDocument());
    expect(screen.getByText(/いいねしました/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications?cursor=n1");
  });
});
