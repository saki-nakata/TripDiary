"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/contexts/toast-context";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { PostCard } from "@/components/posts/PostCard";
import { SavedMapSection } from "@/components/posts/SavedMapSection";
import { FollowFeed } from "@/components/posts/FollowFeed";
import type { Post } from "@/types/post";

type Variant = "post-grid" | "wishlist" | "visited" | "follow-feed";

type Props = {
  initialPosts: Post[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  /** cursorを除いた継続取得用のURL（例: "/api/users/user-1/posts?year=2026"）。cursorはこのコンポーネントが付与する */
  baseUrl: string;
  variant: Variant;
  viewerId?: string;
};

// マイページ・プロフィールの各一覧（自分の投稿・行きたい・訪問済み・フォロー中の投稿）で共通利用する
// 無限スクロール導線（GATE-22種類A）。Server Componentが取得した初回ページを受け取り、
// 末尾のsentinelが表示範囲に入るたびにcursorで継続取得してリストへ追記する
export function LoadMoreList({ initialPosts, initialNextCursor, initialHasMore, baseUrl, variant, viewerId }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const res = await fetch(`${baseUrl}${separator}cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) {
        showToast("読み込みに失敗しました", "error");
        return;
      }
      const data: { posts: Post[]; nextCursor: string | null; hasMore: boolean } = await res.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      showToast("読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading, baseUrl]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  return (
    <div>
      {variant === "post-grid" && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} />
          ))}
        </div>
      )}
      {(variant === "wishlist" || variant === "visited") && <SavedMapSection posts={posts} kind={variant} />}
      {variant === "follow-feed" && <FollowFeed posts={posts} />}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center mt-6 py-2">
          {loading && <span className="text-sm text-zinc-400">読み込み中...</span>}
        </div>
      )}
    </div>
  );
}
