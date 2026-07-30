"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FollowButton } from "@/components/users/FollowButton";

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
  viewerId?: string;
};

// プロフィールの「フォロワー」「フォロー中」タブ共通の継続取得UI（GATE-22種類B）
export function UserLoadMoreList({ initialUsers, initialNextCursor, initialHasMore, baseUrl, viewerId }: Props) {
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
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <Link href={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-200 shrink-0">
                {user.image ? <Image src={user.image} alt={user.nickname} fill sizes="40px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500 font-medium">{user.nickname[0]}</div>}
              </div>
              <div className="min-w-0"><p className="text-sm font-medium text-zinc-900 truncate">{user.nickname}</p>{user.bio && <p className="text-xs text-zinc-500 truncate">{user.bio}</p>}</div>
            </Link>
            {viewerId && viewerId !== user.id && <FollowButton userId={user.id} initialFollowing={user.followedByCurrentUser} isLoggedIn size="sm" />}
          </div>
        ))}
      </div>
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
