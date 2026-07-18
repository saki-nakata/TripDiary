"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/contexts/toast-context";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { formatDateSlash } from "@/lib/date";
import type { Comment } from "@/types/post";

type Props = {
  postId: string;
  currentUserId?: string;
  postAuthorId: string;
};

export function CommentSection({ postId, currentUserId, postAuthorId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState("");
  const { showToast } = useToast();
  const requireLogin = useRequireLogin();
  // コメント一覧の取得(loadComments)は非同期のため、投稿・削除など後から始まった操作の方が
  // 先に完了することがある。その状態で古いfetchの結果を無条件に適用すると、投稿直後の
  // 一覧が「投稿前の空の状態」で上書きされてしまう（2026-07-06 E2Eテストで発覚）。
  // 各操作の開始時にこの値をインクリメントし、fetch完了時に値が変わっていれば
  // （＝自分より新しい操作が始まっていれば）自分の結果は古いものとして破棄する。
  const opSeqRef = useRef(0);

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function loadComments(cursor?: string) {
    const mySeq = ++opSeqRef.current;
    try {
      const url = `/api/posts/${postId}/comments${cursor ? `?cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (mySeq !== opSeqRef.current) return;
      setComments((prev) => cursor ? [...prev, ...data.comments] : data.comments);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      if (mySeq === opSeqRef.current) showToast("コメントの読み込みに失敗しました", "error");
    } finally {
      // 新しい操作（投稿・削除）に追い越されていても、初回ロードのスピナーは必ず解除する
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentUserId) {
      requireLogin("コメントするにはログインが必要です");
      return;
    }
    const trimmed = body.trim();
    if (!trimmed || submitting) return;

    const optimisticComment: Comment = {
      id: `optimistic-${Date.now()}`,
      body: trimmed,
      createdAt: new Date().toISOString(),
      author: { id: currentUserId, nickname: "...", image: null },
    };

    opSeqRef.current++;
    setComments((prev) => [...prev, optimisticComment]);
    setBody("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setComments((prev) =>
        prev.map((c) => (c.id === optimisticComment.id ? { ...saved } : c))
      );
      showToast("コメントを投稿しました", "success", 500);
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      setBody(trimmed);
      showToast("コメントの投稿に失敗しました", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      opSeqRef.current++;
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      showToast("削除に失敗しました", "error");
    }
  }

  return (
    <>
    <section className="mt-8">
      <h2 className="text-base font-semibold text-zinc-800 mb-4">💬 コメント</h2>

      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="コメントを入力..."
            maxLength={2000}
            rows={3}
            disabled={submitting}
            data-testid="comment-textarea"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-zinc-50 disabled:text-zinc-400"
          />
          {/* モバイルは文字数カウント＋投稿ボタンを先に表示し、コメント件数を次の行に分離する */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
            {comments.length > 0 && (
              <span className="order-2 sm:order-1 text-base font-semibold text-zinc-600">{comments.length}件</span>
            )}
            <div className="order-1 sm:order-2 flex items-center justify-end gap-3">
              <span className={`text-xs ${body.length > 2000 ? "text-red-500" : "text-zinc-400"}`}>
                {body.length} / 2000 文字
              </span>
              <button
                type="submit"
                disabled={!body.trim() || submitting}
                className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "送信中..." : "コメントを投稿"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-zinc-500">
          <Link href="/login" className="text-green-600 hover:underline font-medium">
            ログインする
          </Link>
          とコメントできます
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">読み込み中...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-zinc-400">まだコメントはありません。最初のコメントを投稿しましょう！</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => {
            const canDelete =
              currentUserId === comment.author.id || currentUserId === postAuthorId;
            return (
              <li key={comment.id} className="flex gap-3" data-testid="comment-item">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-200 shrink-0">
                  {comment.author.image ? (
                    <Image
                      src={comment.author.image}
                      alt={comment.author.nickname}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xs font-medium text-zinc-500">
                      {comment.author.nickname[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-zinc-800">{comment.author.nickname}</span>
                  <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{comment.body}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-zinc-400">
                      {formatDateSlash(comment.createdAt)}
                    </span>
                    {canDelete && (
                      <>
                        <span className="mx-2 text-zinc-200 text-xs">|</span>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          削除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          onClick={() => loadComments(nextCursor ?? undefined)}
          className="mt-4 text-sm text-green-600 hover:underline"
        >
          もっと見る
        </button>
      )}
    </section>
    </>
  );
}
