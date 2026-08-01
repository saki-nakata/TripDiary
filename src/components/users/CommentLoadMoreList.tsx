"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { formatDateSlash } from "@/lib/date";
import { useToast } from "@/contexts/toast-context";

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
  variant: "written" | "received";
};

// プロフィールの「投稿したコメント」「自分へのコメント」タブ共通の継続取得UI（GATE-22種類B）
export function CommentLoadMoreList({ initialComments, initialNextCursor, initialHasMore, baseUrl, variant }: Props) {
  const [comments, setComments] = useState(initialComments);
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
      if (!res.ok) throw new Error("failed to load comments");
      const data: { comments: AuthorComment[]; nextCursor: string | null; hasMore: boolean } = await res.json();
      setComments((prev) => [...prev, ...data.comments]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      showToast("読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, baseUrl, showToast]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  return (
    <div>
      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} variant={variant} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center mt-4 py-2">
          {loading && <span className="text-sm text-zinc-400">読み込み中...</span>}
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, variant }: { comment: AuthorComment; variant: "written" | "received" }) {
  const isReceived = variant === "received";
  return (
    <Link href={`/posts/${comment.postId}`} className="flex gap-3 p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors">
      <div className={`relative ${isReceived ? "w-10 h-10 rounded-full" : "w-14 h-14 rounded-lg"} overflow-hidden bg-zinc-200 shrink-0`}>
        {isReceived
          ? comment.author.image
            ? <Image src={comment.author.image} alt={comment.author.nickname} fill sizes="40px" className="object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500 font-medium">{comment.author.nickname[0]}</div>
          : comment.post.images[0] && <Image src={comment.post.images[0].url} alt={comment.post.title} fill sizes="56px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-400 mb-1">
          {isReceived ? <><span className="font-bold text-zinc-600">{comment.author.nickname}</span> さんから『{comment.post.title}』へ</> : <>『{comment.post.title}』（{comment.post.author.nickname}）</>}
        </p>
        <p className="text-sm text-zinc-700">{comment.body}</p>
        <p className="text-xs text-zinc-400 mt-1">{formatDateSlash(comment.createdAt)}</p>
      </div>
    </Link>
  );
}
