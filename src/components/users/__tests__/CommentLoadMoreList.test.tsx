// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CommentLoadMoreList, type AuthorComment } from "@/components/users/CommentLoadMoreList";
import { ToastProvider } from "@/contexts/toast-context";

function renderWithToast(ui: React.ReactNode) {
  render(<ToastProvider>{ui}</ToastProvider>);
}

function makeComment(id: string, body: string): AuthorComment {
  return {
    id,
    body,
    postId: "post-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    author: { id: "author-1", nickname: "投稿者", image: null },
    post: { id: "post-1", title: "投稿タイトル", images: [], author: { id: "author-1", nickname: "投稿者", image: null } },
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

describe("CommentLoadMoreList（GATE-22種類B: 継続取得の共通UI導線）", () => {
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
      <CommentLoadMoreList
        initialComments={[makeComment("c1", "コメントA")]}
        initialNextCursor={null}
        initialHasMore={false}
        baseUrl="/api/users/author-1/comments"
        variant="written"
      />
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sentinelが表示範囲に入る_追加取得したコメントが末尾に追記される", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ comments: [makeComment("c2", "コメントB")], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <CommentLoadMoreList
        initialComments={[makeComment("c1", "コメントA")]}
        initialNextCursor="c1"
        initialHasMore={true}
        baseUrl="/api/users/author-1/comments"
        variant="written"
      />
    );

    await waitFor(() => expect(screen.getByText("コメントB")).toBeInTheDocument());
    expect(screen.getByText("コメントA")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/users/author-1/comments?cursor=c1");
  });

  it("継続取得が失敗しても既存一覧を維持してエラーを表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    renderWithToast(
      <CommentLoadMoreList
        initialComments={[makeComment("c1", "コメントA")]}
        initialNextCursor="c1"
        initialHasMore={true}
        baseUrl="/api/users/author-1/comments"
        variant="written"
      />
    );

    await waitFor(() => expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument());
    expect(screen.getByText("コメントA")).toBeInTheDocument();
  });
});
