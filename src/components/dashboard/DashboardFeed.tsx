"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { PostCard } from "@/components/posts/PostCard";
import type { Post } from "@/types/post";

export function DashboardFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildUrl = useCallback((cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    return `/api/posts?${params.toString()}`;
  }, []);

  useEffect(() => {
    fetch(buildUrl())
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts ?? []);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .finally(() => setLoading(false));
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
              setPosts((prev) => [...prev, ...(data.posts ?? [])]);
              setNextCursor(data.nextCursor);
              setHasMore(data.hasMore);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-56 rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <p className="text-4xl mb-3">✈️</p>
        <p className="text-sm mb-1">まだ投稿がありません</p>
        <p className="text-xs mb-6">旅スポットを投稿するか、ユーザーをフォローしましょう</p>
        <div className="flex gap-3">
          <Link
            href="/posts/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            ✏️ 投稿する
          </Link>
          <Link
            href="/search?tab=users"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            👥 ユーザーを探す
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
