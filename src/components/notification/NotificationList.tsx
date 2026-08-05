"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { formatDateSlash } from "@/lib/date";
import { useToast } from "@/contexts/toast-context";

type Notification = {
  id: string;
  type: string;
  postId: string | null;
  commentBody: string | null;
  read: boolean;
  createdAt: string;
  fromUser: { id: string; nickname: string; image: string | null };
};

function formatRelativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return formatDateSlash(iso);
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => Promise<boolean>;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (notification.read || calledRef.current) return;
    const el = ref.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;
    let raf2 = 0;
    let cancelled = false;

    // レイアウト確定前にコールバックが発火し誤って既読化されるのを防ぐため、
    // 描画が安定してから observer を登録する
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !calledRef.current) {
              // 呼び出し中フラグ（同一表示中の多重発火防止）。既読化に失敗した場合は
              // falseへ戻し、次にビューポートへ再度入った際に再試行できるようにする
              // （第4ラウンドレビューB-3: 失敗後は再読み込みまで二度と既読化されなかった不具合）
              calledRef.current = true;
              void onRead(notification.id).then((success) => {
                if (success) {
                  observer?.disconnect();
                } else if (!cancelled) {
                  calledRef.current = false;
                }
              });
            }
          },
          { threshold: 0.5 }
        );
        observer.observe(el);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer?.disconnect();
    };
  }, [notification.id, notification.read, onRead]);

  const { type, fromUser, postId, commentBody } = notification;
  let iconCodepoint = "";
  let iconAlt = "";
  let plainIcon = "";
  let text = "";
  const href = postId ? `/posts/${postId}` : `/users/${fromUser.id}`;

  if (type === "like") {
    iconCodepoint = "2764";
    iconAlt = "❤️";
    text = `${fromUser.nickname} さんがあなたの投稿にいいねしました`;
  } else if (type === "comment") {
    plainIcon = "💬";
    text = `${fromUser.nickname} さんがあなたの投稿にコメントしました`;
  } else if (type === "follow") {
    iconCodepoint = "1f465";
    iconAlt = "👥";
    text = `${fromUser.nickname} さんがあなたをフォローしました`;
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={`flex items-start gap-3 px-4 py-4 border-b border-surface-border hover:bg-[#f8fafc] dark:hover:bg-white/5 transition-colors
        ${notification.read ? "opacity-60" : "bg-[#f0fdf4] dark:bg-green-950/40"}`}
    >
      {plainIcon ? (
        <span className="text-xl shrink-0 mt-0.5">{plainIcon}</span>
      ) : (
        <TwemojiIcon codepoint={iconCodepoint} alt={iconAlt} className="h-5 w-5 shrink-0 mt-0.5" />
      )}
      <div className="w-8 h-8 rounded-full bg-[#16a34a]/10 dark:bg-[#16a34a]/20 flex items-center justify-center shrink-0 text-sm font-semibold text-[#166534] dark:text-[#4ade80]">
        {fromUser.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fromUser.image} alt={fromUser.nickname} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          fromUser.nickname[0]
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[0.8rem] sm:text-sm text-surface-foreground">{text}</p>
          <span className="text-xs text-[#64748b] dark:text-zinc-400 shrink-0 -mr-2 sm:mr-1">{formatRelativeDate(notification.createdAt)}</span>
        </div>
        {type === "comment" && commentBody && (
          <p className="text-xs text-[#64748b] dark:text-zinc-400 mt-0.5 line-clamp-1">「{commentBody}」</p>
        )}
      </div>
      {!notification.read && (
        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2" />
      )}
    </Link>
  );
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) throw new Error("failed to load notifications");
        const d: { notifications?: Notification[]; nextCursor?: string | null; hasMore?: boolean } = await res.json();
        if (!active) return;
        setNotifications(d.notifications ?? []);
        setCursor(d.nextCursor ?? null);
        setHasMore(d.hasMore ?? false);
      } catch {
        if (!active) return;
        setLoadError(true);
        showToast("通知の読み込みに失敗しました", "error");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInitial();
    return () => { active = false; };
  }, [showToast]);

  // 通知一覧の継続取得（GATE-22種類A）。マイページ/プロフィールのLoadMoreListと同様、
  // 末尾のidをcursorとして次のページを追加取得する
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error("failed to load notifications");
      const data: { notifications: Notification[]; nextCursor: string | null; hasMore: boolean } = await res.json();
      setNotifications((prev) => [...prev, ...data.notifications]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      showToast("通知の読み込みに失敗しました", "error");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, showToast]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading: loadingMore, onLoadMore: loadMore });

  const handleRead = useCallback(async (id: string): Promise<boolean> => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    queryClient.setQueryData(["unread-count"], (old: number | undefined) =>
      Math.max(0, (old ?? 0) - 1)
    );
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("failed to mark as read");
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
      return true;
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      queryClient.setQueryData(["unread-count"], (old: number | undefined) => (old ?? 0) + 1);
      return false;
    }
  }, [queryClient]);

  if (loading) {
    return (
      <div className="rounded-xl border border-surface-border flex justify-center py-16 text-[#64748b] dark:text-zinc-400">
        読み込み中…
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border flex flex-col items-center py-16 text-[#64748b] dark:text-zinc-400">
        <TwemojiIcon codepoint="1f514" className="h-12 w-12 mb-3" />
        <p>{loadError ? "通知の読み込みに失敗しました" : "まだ通知はありません"}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-surface-border overflow-hidden">
        {notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onRead={handleRead} />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center mt-6 py-2">
          {loadingMore && <span className="text-sm text-zinc-400">読み込み中...</span>}
        </div>
      )}
    </div>
  );
}
