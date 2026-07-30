"use client";

import { useState } from "react";

export type AuthorComment = {
  id: string;
  body: string;
  postId: string;
  createdAt: string;
  author: { id: string; nickname: string; image: string | null };
  post: {
    id: string;
    title: string;
    images: { url: string }[];
    author: { id: string; nickname: string; image: string | null };
  };
};

type Props = {
  initialComments: AuthorComment[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  baseUrl: string;
  render: (comments: AuthorComment[]) => React.ReactNode;
};

// プロフィールの「投稿したコメント」「自分へのコメント」タブ共通の継続取得UI（GATE-22種類B）
export function CommentLoadMoreList({ initialComments, initialNextCursor, initialHasMore, baseUrl, render }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const separator = baseUrl.includes("?") ? "&" : "?";
      const res = await fetch(`${baseUrl}${separator}cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) return;
      const data: { comments: AuthorComment[]; nextCursor: string | null; hasMore: boolean } = await res.json();
      setComments((prev) => [...prev, ...data.comments]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {render(comments)}
      {hasMore && (
        <div className="flex justify-center mt-4">
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
