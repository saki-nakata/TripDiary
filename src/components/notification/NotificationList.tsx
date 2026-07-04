"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";

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
  return new Date(iso).toLocaleDateString("ja-JP");
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
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
              calledRef.current = true;
              onRead(notification.id);
              observer?.disconnect();
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
  let icon = "";
  let text = "";
  const href = postId ? `/posts/${postId}` : `/users/${fromUser.id}`;

  if (type === "like") {
    icon = "👍";
    text = `${fromUser.nickname} さんがあなたの投稿にいいねしました`;
  } else if (type === "comment") {
    icon = "💬";
    text = `${fromUser.nickname} さんがあなたの投稿にコメントしました`;
  } else if (type === "follow") {
    icon = "👤";
    text = `${fromUser.nickname} さんがあなたをフォローしました`;
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={`flex items-start gap-3 px-4 py-4 border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors
        ${notification.read ? "opacity-60" : "bg-[#f0fdf4]"}`}
    >
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div className="w-8 h-8 rounded-full bg-[#16a34a]/10 flex items-center justify-center shrink-0 text-sm font-semibold text-[#16a34a]">
        {fromUser.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fromUser.image} alt={fromUser.nickname} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          fromUser.nickname[0]
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1e293b]">{text}</p>
        {type === "comment" && commentBody && (
          <p className="text-xs text-[#64748b] mt-0.5 line-clamp-1">「{commentBody}」</p>
        )}
        <p className="text-xs text-[#94a3b8] mt-1">{formatRelativeDate(notification.createdAt)}</p>
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
  const queryClient = useQueryClient();

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleRead = useCallback(async (id: string) => {
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
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      queryClient.setQueryData(["unread-count"], (old: number | undefined) => (old ?? 0) + 1);
    }
  }, [queryClient]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-[#94a3b8]">読み込み中…</div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-[#94a3b8]">
        <span className="text-5xl mb-3">🔔</span>
        <p>まだ通知はありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e2e8f0] overflow-hidden">
      {notifications.map((n) => (
        <NotificationItem key={n.id} notification={n} onRead={handleRead} />
      ))}
    </div>
  );
}
