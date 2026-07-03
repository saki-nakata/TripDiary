"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PostCard } from "@/components/posts/PostCard";
import type { Post } from "@/types/post";

type FeedState = { posts: Post[]; nextCursor: string | null; hasMore: boolean; loading: boolean };

export function PostFeed() {
  const searchParams = useSearchParams();
  const [feed, setFeed] = useState<FeedState>({ posts: [], nextCursor: null, hasMore: true, loading: true });
  const { posts, nextCursor, hasMore, loading } = feed;
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sort = searchParams.get("sort") ?? "latest";
  const category = searchParams.get("category") ?? "";
  const prefecture = searchParams.get("prefecture") ?? "";

  const buildUrl = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (sort) params.set("sort", sort);
      if (category) params.set("category", category);
      if (prefecture) params.set("prefecture", prefecture);
      if (cursor) params.set("cursor", cursor);
      return `/api/posts/explore?${params.toString()}`;
    },
    [sort, category, prefecture]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFeed({ posts: [], nextCursor: null, hasMore: true, loading: true });

    fetch(buildUrl())
      .then((r) => r.json())
      .then((data) => {
        setFeed({ posts: data.posts ?? [], nextCursor: data.nextCursor, hasMore: data.hasMore, loading: false });
      })
      .catch(() => setFeed((prev) => ({ ...prev, loading: false })));
  }, [buildUrl]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && nextCursor) {
          setLoadingMore(true);
          fetch(buildUrl(nextCursor))
            .then((r) => r.json())
            .then((data) => {
              setFeed((prev) => ({
                posts: [...prev.posts, ...(data.posts ?? [])],
                nextCursor: data.nextCursor,
                hasMore: data.hasMore,
                loading: false,
              }));
            })
            .finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [buildUrl, hasMore, loadingMore, nextCursor]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <p className="text-4xl mb-3">🗺️</p>
        <p className="text-sm">該当する投稿がありません</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {loadingMore && (
        <p className="text-center text-sm text-zinc-400 py-4">読み込み中...</p>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-sm text-zinc-400 py-4">すべての投稿を表示しました</p>
      )}
    </>
  );
}
