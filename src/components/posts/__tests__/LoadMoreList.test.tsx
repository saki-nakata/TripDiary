// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/contexts/toast-context";
import { LoadMoreList } from "@/components/posts/LoadMoreList";
import type { Post } from "@/types/post";

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

vi.mock("@/components/posts/PostCard", () => ({
  PostCard: ({ post }: { post: Post }) => <div>{post.title}</div>,
}));

function renderWithToast(component: React.ReactNode) {
  return render(<ToastProvider>{component}</ToastProvider>);
}

function makePost(id: string, title: string): Post {
  return {
    id,
    title,
    body: "本文",
    location: "東京都",
    category: "観光",
    rating: null,
    visitedAt: "2026-01-01",
    cost: null,
    costBreakdown: null,
    lat: null,
    lng: null,
    planId: null,
    authorId: "author-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 0,
    author: { id: "author-1", nickname: "投稿者", image: null },
    images: [],
    _count: { likes: 0, comments: 0 },
  };
}

describe("LoadMoreList（GATE-22種類A: 継続取得の共通UI導線）", () => {
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
      <LoadMoreList
        initialPosts={[makePost("post-1", "投稿A")]}
        initialNextCursor={null}
        initialHasMore={false}
        baseUrl="/api/users/author-1/posts"
        variant="post-grid"
      />
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sentinelが表示範囲に入る_追加取得した投稿が末尾に追記されカーソルとhasMoreが更新される", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [makePost("post-2", "投稿B")],
        nextCursor: null,
        hasMore: false,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <LoadMoreList
        initialPosts={[makePost("post-1", "投稿A")]}
        initialNextCursor="post-1"
        initialHasMore={true}
        baseUrl="/api/users/author-1/posts"
        variant="post-grid"
      />
    );

    await waitFor(() => expect(screen.getByText("投稿B")).toBeInTheDocument());
    expect(screen.getByText("投稿A")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/users/author-1/posts?cursor=post-1");
  });

  it("baseUrlに既存のクエリがある場合_区切り文字に&を使ってcursorを付与する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <LoadMoreList
        initialPosts={[makePost("post-1", "投稿A")]}
        initialNextCursor="post-1"
        initialHasMore={true}
        baseUrl="/api/users/author-1/posts?year=2026"
        variant="post-grid"
      />
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/users/author-1/posts?year=2026&cursor=post-1")
    );
  });

  it("API失敗時_エラートーストを表示し既存の投稿一覧とhasMoreは変化しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = renderWithToast(
      <LoadMoreList
        initialPosts={[makePost("post-1", "投稿A")]}
        initialNextCursor="post-1"
        initialHasMore={true}
        baseUrl="/api/users/author-1/posts"
        variant="post-grid"
      />
    );

    await waitFor(() => expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument());
    // hasMoreが変わらず失敗し続けるため、sentinelが再試行し続ける前に明示的にアンマウントする
    unmount();
  });
});
