// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchClient } from "@/components/search/SearchClient";
import type { Post } from "@/types/post";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/search",
  useSearchParams: () => searchParams,
}));

vi.mock("@/components/posts/PostCard", () => ({
  PostCard: ({ post }: { post: Post }) => <div>{post.title}</div>,
}));

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

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SearchClient viewerId={undefined} />
    </QueryClientProvider>
  );
}

describe("SearchClient 旅スポットタブ（GATE-22フォローアップ: 無限スクロール対応）", () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("新着順_sentinelの自動発火で次ページが継続取得される", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: [makePost("p1", "投稿A")], nextCursor: "p1", hasMore: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: [makePost("p2", "投稿B")], nextCursor: null, hasMore: false }),
      });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient();

    await waitFor(() => expect(screen.getByText("投稿A")).toBeInTheDocument());
    // 1ページ目取得後、hasNextPage=trueによりsentinelが表示され、モックのIntersectionObserverが
    // 自動発火して次ページ（cursor=p1）を継続取得する
    await waitFor(() => expect(screen.getByText("投稿B")).toBeInTheDocument());

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/posts/explore?sort=latest&limit=20");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/posts/explore?sort=latest&limit=20&cursor=p1");
  });

  it("次ページが無い場合はsentinelの自動発火による追加取得が発生しない", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [makePost("p1", "投稿A")], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithClient();

    await waitFor(() => expect(screen.getByText("投稿A")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("検索APIが失敗した場合は0件表示ではなくエラーを表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    renderWithClient();

    await waitFor(() => expect(screen.getByText("検索結果の読み込みに失敗しました")).toBeInTheDocument());
  });

  it("エリア取得APIが失敗した場合は空状態ではなくエラーを表示する", async () => {
    searchParams = new URLSearchParams("tab=area");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    renderWithClient();

    await waitFor(() => expect(screen.getByText("エリアの読み込みに失敗しました")).toBeInTheDocument());
  });

  it("ユーザー検索APIが失敗した場合は空状態ではなくエラーを表示する", async () => {
    searchParams = new URLSearchParams("tab=user");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    renderWithClient();

    await waitFor(() => expect(screen.getByText("ユーザー検索に失敗しました")).toBeInTheDocument());
  });
});
