// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UserLoadMoreList, type FollowListUser } from "@/components/users/UserLoadMoreList";
import { ToastProvider } from "@/contexts/toast-context";

function renderWithToast(ui: React.ReactNode) {
  render(<ToastProvider>{ui}</ToastProvider>);
}

function makeUser(id: string, nickname: string): FollowListUser {
  return { id, nickname, image: null, bio: null, followedByCurrentUser: false };
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

describe("UserLoadMoreList（GATE-22種類B: 継続取得の共通UI導線）", () => {
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
      <UserLoadMoreList
        initialUsers={[makeUser("u1", "たろう")]}
        initialNextCursor={null}
        initialHasMore={false}
        baseUrl="/api/users/user-1/followers"
      />
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sentinelが表示範囲に入る_追加取得したユーザーが末尾に追記される", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: [makeUser("u2", "はなこ")], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithToast(
      <UserLoadMoreList
        initialUsers={[makeUser("u1", "たろう")]}
        initialNextCursor="u1"
        initialHasMore={true}
        baseUrl="/api/users/user-1/followers"
      />
    );

    await waitFor(() => expect(screen.getByText("はなこ")).toBeInTheDocument());
    expect(screen.getByText("たろう")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1/followers?cursor=u1");
  });

  it("継続取得が失敗しても既存一覧を維持してエラーを表示する", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    renderWithToast(
      <UserLoadMoreList
        initialUsers={[makeUser("u1", "たろう")]}
        initialNextCursor="u1"
        initialHasMore={true}
        baseUrl="/api/users/user-1/followers"
      />
    );

    await waitFor(() => expect(screen.getByText("読み込みに失敗しました")).toBeInTheDocument());
    expect(screen.getByText("たろう")).toBeInTheDocument();
  });
});
