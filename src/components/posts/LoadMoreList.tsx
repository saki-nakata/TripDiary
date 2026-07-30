"use client";

import { useState } from "react";
import { useToast } from "@/contexts/toast-context";
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
// 「もっと見る」導線（GATE-22種類A）。Server Componentが取得した初回ページを受け取り、
// クリックのたびにcursorで継続取得してリストへ追記する
export function LoadMoreList({ initialPosts, initialNextCursor, initialHasMore, baseUrl, variant, viewerId }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function loadMore() {
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
  }

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
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {loading ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}
