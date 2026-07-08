import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  findPostsByAuthorId,
  findWishlistedPosts,
  findVisitedPosts,
  findFollowingPosts,
  countFollowingFeedPosts,
} from "@/lib/repositories/post.repository";
import { countUserPosts } from "@/lib/repositories/user.repository";
import { countWishlistByUser } from "@/lib/repositories/wishlist.repository";
import { countVisitedByUser } from "@/lib/repositories/user.repository";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/empty-state";
import type { Post } from "@/types/post";

export const metadata: Metadata = { title: "マイページ — TripDiary" };

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

const TABS = [
  { key: "myposts", label: "✈️ 自分の投稿" },
  { key: "wishlist", label: "🔖 行きたい" },
  { key: "visited", label: "✅ 訪問済み" },
  { key: "follow-feed", label: "👥 フォロー中の投稿" },
] as const;

const TAB_TITLES: Record<string, string> = {
  myposts: "✈️ 自分の投稿",
  wishlist: "🔖 行きたい",
  visited: "✅ 訪問済み",
  "follow-feed": "👥 フォロー中の投稿",
};

export default async function MyPage({ searchParams }: Props) {
  const { tab = "myposts" } = await searchParams;
  const session = await auth();
  const userId = session!.user.id!;

  const activeTab = TABS.some((t) => t.key === tab) ? tab : "myposts";

  const [postCount, wishlistCount, visitedCount, followFeedCount] = await Promise.all([
    countUserPosts(userId),
    countWishlistByUser(userId),
    countVisitedByUser(userId),
    countFollowingFeedPosts(userId),
  ]);

  const counts: Record<string, number> = {
    myposts: postCount,
    wishlist: wishlistCount,
    visited: visitedCount,
    "follow-feed": followFeedCount,
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 -mt-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="flex items-center gap-4 text-2xl font-bold text-[#1e293b]">
          {TAB_TITLES[activeTab]}
          <span className="inline-flex items-center h-7 text-[0.85rem] leading-none font-semibold text-[#64748b] bg-[#e5e7eb] rounded-full px-3">
            {counts[activeTab]}
          </span>
        </h1>
        <span className="rounded-md bg-rose-50 text-rose-800 text-sm px-3 py-1.5 border border-rose-200 border-l-[3px] border-l-rose-500 font-medium shrink-0">
          🔒 この画面は自分のみ表示
        </span>
      </div>

      {/* Tabs（モバイルのみ表示。デスクトップはサイドバーのマイページ各項目から切り替える） */}
      <div className="md:hidden flex gap-1 border-b border-zinc-200 overflow-x-auto overflow-y-hidden">
        {TABS.map((t) => {
          const icon = t.label.split(" ")[0];
          return (
            <Link
              key={t.key}
              href={`/mypage?tab=${t.key}`}
              title={t.label}
              className={`px-3 py-2 text-lg border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? "border-[#16a34a] text-[#16a34a]"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {icon}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "myposts" && (await renderMyPosts(userId))}
        {activeTab === "wishlist" && (await renderWishlist(userId))}
        {activeTab === "visited" && (await renderVisited(userId))}
        {activeTab === "follow-feed" && (await renderFollowFeed(userId))}
      </div>
    </div>
  );
}

async function renderMyPosts(userId: string) {
  const { posts } = await findPostsByAuthorId({ authorId: userId, viewerId: userId });
  if (posts.length === 0) {
    return <EmptyState emoji="✈️" message="まだ投稿がありません" ctaLabel="投稿する" ctaHref="/posts/new" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} viewerId={userId} showCost />
      ))}
    </div>
  );
}

async function renderWishlist(userId: string) {
  const { posts } = await findWishlistedPosts({ userId });
  if (posts.length === 0) {
    return <EmptyState emoji="🔖" message="行きたいリストがまだありません" ctaLabel="スポットを探す" ctaHref="/" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} />
      ))}
    </div>
  );
}

async function renderVisited(userId: string) {
  const { posts } = await findVisitedPosts({ userId });
  if (posts.length === 0) {
    return <EmptyState emoji="✅" message="訪問済みのスポットがありません" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} />
      ))}
    </div>
  );
}

async function renderFollowFeed(userId: string) {
  const { posts } = await findFollowingPosts({ userId });
  if (posts.length === 0) {
    return <EmptyState emoji="👥" message="フォロー中のユーザーがいません" ctaLabel="ユーザーを探す" ctaHref="/search?tab=user" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} />
      ))}
    </div>
  );
}
