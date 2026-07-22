"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { PostCard } from "@/components/posts/PostCard";
import { BackButton } from "@/components/posts/BackButton";
import { FollowButton } from "@/components/users/FollowButton";
import { EmptyState } from "@/components/ui/empty-state";
import { CATEGORIES, LOCATIONS, CATEGORY_COLORS } from "@/lib/constants";
import { CategoryIcon } from "@/components/ui/category-icon";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { formatDateSlash } from "@/lib/date";
import type { PostsResponse } from "@/types/post";

type AreaItem = { location: string; count: number; thumbnailUrl: string | null };
type UserItem = {
  id: string;
  nickname: string;
  image: string | null;
  bio: string | null;
  _count: { posts: number; followers: number };
  followedByCurrentUser: boolean;
  tabiScore: number;
  tabiRank: string;
};
type UsersResponse = { users: UserItem[]; nextCursor: string | null; hasMore: boolean };

const TABS = [
  { key: "post", icon: "🗾", label: "旅スポット" },
  { key: "area", icon: "📍", label: "エリア" },
  { key: "user", icon: "👥", label: "ユーザー" },
] as const;

const MEDALS = ["🥇", "🥈", "🥉"];

export function SearchClient({ viewerId }: { viewerId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as (typeof TABS)[number]["key"]) ?? "post";
  const initialSort = searchParams.get("sort") === "popular" ? "popular" : "latest";
  const [q, setQ] = useState("");

  function setTab(key: string) {
    router.push(`/search?tab=${key}`, { scroll: false });
  }

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 z-10 md:left-2">
        <BackButton />
      </div>
      <div className="max-w-6xl mx-auto p-4 md:p-5 lg:p-8 space-y-2 sm:space-y-4 -mt-4">
        {/* pt-4: スマホ用の余白。md〜lg（768〜1279px、iPad Pro縦向き含む）は
            コンテナのパディングが p-8 でも -mt-4 と相殺すると余白が足りず重なる
            ため pt-9 に広げ、本当にPC幅と言える xl（1280px）で解除する */}
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1e293b] pt-5 md:pt-3 lg:pt-1 xl:pt-0">
          <TwemojiIcon codepoint="1f50d" className="h-6 w-6" /> 検索
        </h1>

        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="スポット名・エリア・ユーザー名で検索…"
            data-testid="search-input"
            className="w-full h-9 sm:h-11 pl-10 pr-9 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#16a34a]/30"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="検索キーワードを消去"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.6rem] text-white hover:bg-red-600"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex gap-1 border-b border-zinc-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex-1 sm:flex-none flex flex-row items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-2 text-[0.8rem] sm:text-[0.95rem] font-medium transition-colors whitespace-nowrap ${
                tab === t.key ? "text-[#16a34a]" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <span className="text-base sm:text-[0.95rem]">{t.icon}</span>
              <span>{t.label}</span>
              {tab === t.key && (
                <span className="absolute -bottom-px left-3 right-0 h-0.5 bg-[#16a34a]" />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[420px]">
          {tab === "post" && (
            <PostSearchTab
              location={undefined}
              q={q}
              initialSort={initialSort}
              initialCategory={searchParams.get("category") ?? ""}
            />
          )}
          {tab === "area" && <AreaSearchTab q={q} initialLocation={searchParams.get("location")} />}
          {tab === "user" && <UserSearchTab q={q} viewerId={viewerId} />}
        </div>
      </div>
    </div>
  );
}

function PostSearchTab({
  location,
  q,
  initialSort = "latest",
  showSort = true,
  locationLabel,
  initialCategory = "",
}: {
  location?: string;
  q: string;
  initialSort?: "latest" | "popular";
  showSort?: boolean;
  locationLabel?: string;
  initialCategory?: string;
}) {
  const [category, setCategory] = useState<string>(initialCategory);
  const [sort, setSort] = useState<"latest" | "popular">(initialSort);

  const query = useInfiniteQuery({
    queryKey: ["search-posts", category, sort, location, q],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ sort, limit: "20" });
      if (category) params.set("category", category);
      if (location) params.set("location", location);
      if (q) params.set("q", q);
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(`/api/posts/explore?${params.toString()}`);
      return (await res.json()) as PostsResponse;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined),
    placeholderData: keepPreviousData,
  });

  const posts = query.data?.pages.flatMap((page) => page.posts) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2">
        <button
          onClick={() => setCategory("")}
          className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[0.7rem] sm:text-sm font-medium transition-colors border ${
            category === ""
              ? "bg-blue-400 text-white border-blue-400"
              : "bg-white text-zinc-500 border-zinc-200 hover:border-blue-400 hover:text-blue-500"
          }`}
        >
          全て
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[0.65rem] sm:text-sm font-medium transition-colors border whitespace-nowrap ${
              category === c
                ? "bg-blue-400 text-white border-blue-400"
                : "bg-white text-zinc-500 border-zinc-200 hover:border-blue-400 hover:text-blue-500"
            }`}
          >
            <CategoryIcon category={c} /> <span>{c}</span>
          </button>
        ))}
      </div>

      {locationLabel && (
        <p className="text-sm text-zinc-500">
          📍 <strong className="text-zinc-800">{locationLabel}{category}</strong>の投稿 {posts.length}
          {query.hasNextPage ? "+" : ""}件
        </p>
      )}

      {showSort && (
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <span className="sm:hidden text-sm text-zinc-500">並び順：</span>
          <button
            onClick={() => setSort("latest")}
            className={`px-3 py-1.5 rounded-full text-[0.8rem] sm:text-sm font-medium transition-colors ${
              sort === "latest" ? "bg-[#16a34a] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            新着順
          </button>
          <button
            onClick={() => setSort("popular")}
            className={`px-3 py-1.5 rounded-full text-[0.8rem] sm:text-sm font-medium transition-colors ${
              sort === "popular" ? "bg-[#16a34a] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            人気順
          </button>
        </div>
      )}

      {posts.length === 0 && !query.isLoading ? (
        <EmptyState codepoint="1f3d4" message="該当するスポットがありません" />
      ) : sort === "popular" ? (
        <div className="space-y-2">
          {posts.slice(0, 20).map((post, i) => {
            const thumbnail = post.images[0]?.url ?? null;
            return (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <span
                  className={`w-8 text-center font-bold text-zinc-400 ${
                    i < 3 ? "text-4xl relative -left-2" : "text-lg -ml-2 sm:ml-0"
                  }`}
                >
                  {i < 3 ? MEDALS[i] : i + 1}
                </span>
                <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-zinc-100 -ml-3 sm:ml-0">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg text-zinc-300">
                      <CategoryIcon category={post.category ?? "その他"} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {/* モバイル: タイトル→エリア+カテゴリ→ユーザー名+日付 の3行（②③はハート+カウントと横並び） */}
                  <p className="sm:hidden text-sm font-semibold text-zinc-900 truncate">{post.title}</p>
                  <p className="sm:hidden flex items-center gap-2 text-xs text-zinc-500">
                    <span className="flex-1 min-w-0 flex items-center gap-2">
                      <span className="truncate">📍 {post.location}</span>
                      {post.category && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium ${
                            CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <CategoryIcon category={post.category} /> {post.category}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 flex items-center gap-0.5">
                      <span className="text-sm">❤️</span>
                      <span className="text-sm text-zinc-400">{post._count.likes}</span>
                    </span>
                  </p>
                  <p className="sm:hidden mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="shrink-0 inline-flex items-center gap-0.5 truncate">
                      <TwemojiIcon codepoint="1f464" alt="👤" className="h-3 w-3" />
                      {post.author.nickname}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-0.5">
                      <TwemojiIcon codepoint="1f4c5" alt="📅" className="h-3 w-3" />
                      {formatDateSlash(post.createdAt)}
                    </span>
                  </p>

                  {/* PC/タブレット: タイトル / エリア+カテゴリ+ユーザー名+日付 の2行 */}
                  <p className="hidden sm:block text-sm font-semibold text-zinc-900 truncate">{post.title}</p>
                  <p className="hidden sm:flex items-center gap-3 text-xs text-zinc-500">
                    <span className="truncate">📍 {post.location}</span>
                    {post.category && (
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium ${
                          CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <CategoryIcon category={post.category} /> {post.category}
                      </span>
                    )}
                    <span className="shrink-0 inline-flex items-center gap-0.5 truncate">
                      <TwemojiIcon codepoint="1f464" alt="👤" className="h-3 w-3" />
                      {post.author.nickname}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-0.5">
                      <TwemojiIcon codepoint="1f4c5" alt="📅" className="h-3 w-3" />
                      {formatDateSlash(post.createdAt)}
                    </span>
                  </p>
                </div>
                <div className="hidden sm:flex items-center justify-center self-stretch shrink-0 gap-1">
                  <span className="text-base">❤️</span>
                  <span className="text-sm text-zinc-400">{post._count.likes}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {query.hasNextPage && sort !== "popular" && (
        <div className="flex justify-center">
          <button
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            data-testid="search-more-button"
            className="px-5 py-2 rounded-xl border border-zinc-200 text-sm font-medium hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {query.isFetchingNextPage ? "読み込み中..." : "もっと見る"}
          </button>
        </div>
      )}
    </div>
  );
}

function AreaSearchTab({ q, initialLocation }: { q: string; initialLocation?: string | null }) {
  const [selected, setSelected] = useState<string | null>(initialLocation ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["search-areas"],
    queryFn: async () => {
      const res = await fetch("/api/posts/portal");
      const data = await res.json();
      return (data.locations ?? []) as AreaItem[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="w-16 h-9 rounded-full bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const areasByLocation = new Map(data?.map((a) => [a.location, a]) ?? []);
  const areas = LOCATIONS.map((l) => areasByLocation.get(l)).filter((a): a is AreaItem => a != null);
  if (areas.length === 0) {
    return <EmptyState codepoint="1f4cd" message="投稿があるエリアがありません" />;
  }

  const selectedArea = areas.find((a) => a.location === selected);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 sm:gap-2">
        {areas.map((area) => (
          <button
            key={area.location}
            onClick={() => setSelected((prev) => (prev === area.location ? null : area.location))}
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[0.72rem] sm:text-sm font-medium border transition-colors ${
              selected === area.location
                ? "bg-yellow-400 text-zinc-900 border-yellow-400"
                : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-yellow-400 hover:text-yellow-700"
            }`}
          >
            {area.location}
          </button>
        ))}
      </div>

      {selectedArea && (
        <>
          <hr className="border-t border-dashed border-zinc-200" />
          <PostSearchTab
            location={selectedArea.location}
            q={q}
            showSort={false}
            locationLabel={selectedArea.location}
          />
        </>
      )}
    </div>
  );
}

function UserSearchTab({ q, viewerId }: { q: string; viewerId?: string }) {
  const query = useInfiniteQuery({
    queryKey: ["search-users", q],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ q, limit: "20" });
      if (pageParam) params.set("cursor", pageParam);

      const res = await fetch(`/api/users/search?${params.toString()}`);
      return (await res.json()) as UsersResponse;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => (lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined),
    placeholderData: keepPreviousData,
  });

  const users = query.data?.pages.flatMap((page) => page.users) ?? [];

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !query.hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // query オブジェクト自体は毎レンダー新しい参照になるため、使用する値だけを依存にする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  return (
    <div className="space-y-5">
      {users.length === 0 && !query.isLoading && (
        <EmptyState codepoint="1f464" message="ユーザーが見つかりません" />
      )}

      <div className={`space-y-2 sm:pl-8 ${viewerId ? "sm:max-w-5xl" : "sm:max-w-4xl"}`}>
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 py-3 pl-3 pr-2 sm:py-3 sm:pl-5 sm:pr-3 rounded-xl border border-zinc-200 transition-colors hover:border-zinc-300 hover:bg-zinc-100"
          >
            <Link href={`/users/${u.id}`} className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-200 shrink-0">
                {u.image ? (
                  <Image src={u.image} alt={u.nickname} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500 font-medium">
                    {u.nickname[0]}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 sm:space-y-1">
                <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                  <p className="text-sm font-medium text-zinc-900 truncate">{u.nickname}</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold px-2 py-0.5 shrink-0">
                    ✈️ {u.tabiScore}pts
                  </span>
                </div>
                {u.bio && <p className="text-xs text-zinc-500 truncate">{u.bio}</p>}
                <p className="text-xs text-zinc-400 mt-0.5 sm:mt-0">
                  {u._count.posts}件の投稿 ・ フォロワー {u._count.followers}人
                </p>
              </div>
            </Link>
            {viewerId && viewerId !== u.id && (
              <FollowButton userId={u.id} initialFollowing={u.followedByCurrentUser} isLoggedIn={!!viewerId} size="sm" />
            )}
          </div>
        ))}
      </div>

      {query.hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {query.isFetchingNextPage && <span className="text-sm text-zinc-400">読み込み中...</span>}
        </div>
      )}
    </div>
  );
}
