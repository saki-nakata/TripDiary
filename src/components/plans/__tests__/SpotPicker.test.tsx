// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SpotPicker } from "@/components/plans/SpotPicker";
import { ToastProvider } from "@/contexts/toast-context";
import type { PlanSpotPost } from "@/types/plan";

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

function makePost(id: string, title: string): PlanSpotPost {
  return {
    id,
    title,
    location: "東京都",
    category: "観光",
    rating: null,
    lat: null,
    lng: null,
    authorId: "author-1",
    images: [],
  };
}

function renderWithToast(ui: React.ReactNode) {
  render(<ToastProvider>{ui}</ToastProvider>);
}

describe("SpotPicker（GATE-22フォローアップ: 無限スクロール対応）", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("行きたいリスト候補_初期表示3件を超える分がsentinelの自動発火で追加表示される", async () => {
    const wishlistPosts = Array.from({ length: 15 }, (_, i) => makePost(`w${i}`, `候補${i}`));

    renderWithToast(<SpotPicker initialSelected={[]} wishlistPosts={wishlistPosts} onChange={vi.fn()} />);

    // 初期表示は3件のみ、4件目以降はsentinelの自動発火で段階的に追加表示される（10件ずつ）
    await waitFor(() => expect(screen.getByText("候補14")).toBeInTheDocument());
    expect(screen.getByText("候補0")).toBeInTheDocument();
    expect(screen.queryByText(/残り\d+件/)).not.toBeInTheDocument();
  });

  it("行きたいリスト候補_候補が3件以下の場合はsentinelを表示しない", () => {
    const wishlistPosts = [makePost("w0", "候補0"), makePost("w1", "候補1")];

    renderWithToast(<SpotPicker initialSelected={[]} wishlistPosts={wishlistPosts} onChange={vi.fn()} />);

    expect(screen.getByText("候補0")).toBeInTheDocument();
    expect(screen.getByText("候補1")).toBeInTheDocument();
    expect(screen.queryByText(/残り\d+件/)).not.toBeInTheDocument();
  });

  it("その他のスポット_開くと初回取得し、sentinelの自動発火で次ページも継続取得する", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: [makePost("o1", "その他スポットA")], nextCursor: "o1", hasMore: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ posts: [makePost("o2", "その他スポットB")], nextCursor: null, hasMore: false }),
      });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(<SpotPicker initialSelected={[]} wishlistPosts={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /その他のスポット/ }));

    await waitFor(() => expect(screen.getByText("その他スポットA")).toBeInTheDocument());
    // 初回取得後、othersHasMore=trueによりsentinelが表示され、モックのIntersectionObserverが
    // 自動発火して次ページ（cursor=o1）を継続取得する
    await waitFor(() => expect(screen.getByText("その他スポットB")).toBeInTheDocument());

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/posts/explore?limit=10");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/posts/explore?limit=10&cursor=o1");
  });

  it("その他のスポット取得が失敗してもエラーを表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    renderWithToast(<SpotPicker initialSelected={[]} wishlistPosts={[]} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /その他のスポット/ }));

    await waitFor(() => expect(screen.getByText("スポットの読み込みに失敗しました")).toBeInTheDocument());
  });
});
