"use client";

import { useState } from "react";

export type FollowListUser = {
  id: string;
  nickname: string;
  image: string | null;
  bio: string | null;
  followedByCurrentUser: boolean;
};

type Props = {
  initialUsers: FollowListUser[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  baseUrl: string;
  render: (users: FollowListUser[]) => React.ReactNode;
};

// プロフィールの「フォロワー」「フォロー中」タブ共通の継続取得UI（GATE-22種類B）
export function UserLoadMoreList({ initialUsers, initialNextCursor, initialHasMore, baseUrl, render }: Props) {
  const [users, setUsers] = useState(initialUsers);
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
      const data: { users: FollowListUser[]; nextCursor: string | null; hasMore: boolean } = await res.json();
      setUsers((prev) => [...prev, ...data.users]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {render(users)}
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
