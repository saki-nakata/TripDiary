"use client";

import { useEffect, useRef } from "react";

type Options = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
};

// 一覧末尾のsentinelが画面内に入ったタイミングで自動的に次ページを取得するためのフック。
export function useInfiniteScroll({ hasMore, loading, onLoadMore, rootMargin = "200px" }: Options) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, onLoadMore]);

  return sentinelRef;
}
