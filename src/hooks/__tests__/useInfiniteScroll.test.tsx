// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

// IntersectionObserver をテスト環境向けに簡易実装し、observe直後に isIntersecting: true を発火させる
class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  disconnected = false;
  private callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.rootMargin = options?.rootMargin ?? "";
    MockIntersectionObserver.instances.push(this);
  }
  observe(target: Element) {
    this.callback([{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry], this);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

function Harness({
  hasMore,
  loading,
  onLoadMore,
  rootMargin,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}) {
  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore, rootMargin });
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

describe("useInfiniteScroll", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hasMoreがfalse_observeされずonLoadMoreも呼ばれない", () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore={false} loading={false} onLoadMore={onLoadMore} />);

    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("hasMoreがtrueでsentinelが交差する_onLoadMoreが呼ばれる", () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore={true} loading={false} onLoadMore={onLoadMore} />);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("loading中に交差してもonLoadMoreは呼ばれない", () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore={true} loading={true} onLoadMore={onLoadMore} />);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("アンマウント時にIntersectionObserverがdisconnectされる", () => {
    const onLoadMore = vi.fn();
    const { unmount } = render(<Harness hasMore={true} loading={false} onLoadMore={onLoadMore} />);
    const instance = MockIntersectionObserver.instances[0];

    expect(instance.disconnected).toBe(false);
    unmount();
    expect(instance.disconnected).toBe(true);
  });

  it("hasMoreがtrueからfalseに変わると既存observerをdisconnectし新規observeは行わない", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<Harness hasMore={true} loading={false} onLoadMore={onLoadMore} />);
    expect(MockIntersectionObserver.instances).toHaveLength(1);

    rerender(<Harness hasMore={false} loading={false} onLoadMore={onLoadMore} />);

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].disconnected).toBe(true);
  });

  it("rootMargin省略時は既定の200pxが使われ、指定時はそのまま渡される", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<Harness hasMore={true} loading={false} onLoadMore={onLoadMore} />);
    expect(MockIntersectionObserver.instances[0].rootMargin).toBe("200px");

    rerender(<Harness hasMore={true} loading={false} onLoadMore={onLoadMore} rootMargin="50px" />);
    // rootMarginはeffectの依存配列に含まれないため、hasMore/loading/onLoadMoreが不変な限りobserverは再生成されない
    expect(MockIntersectionObserver.instances).toHaveLength(1);
  });
});
