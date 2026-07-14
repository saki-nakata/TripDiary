"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { PostCard } from "@/components/posts/PostCard";
import { AreaSection } from "@/components/explore/AreaSection";
import { CategorySection } from "@/components/explore/CategorySection";
import { TopRatedSection } from "@/components/explore/TopRatedSection";
import { HighlightedPostScroller } from "@/components/posts/HighlightedPostScroller";
import type { Post } from "@/types/post";

type AreaItem = { location: string; count: number; thumbnailUrl: string | null };
type CategoryItem = { category: string; count: number };

export type PortalFeedData = {
  popular: Post[];
  latest: Post[];
  locations: AreaItem[];
  categories: CategoryItem[];
  topRated: Post[];
};

async function fetchPortalFeed(): Promise<PortalFeedData> {
  const res = await fetch("/api/posts/portal");
  if (!res.ok) throw new Error("フィードの取得に失敗しました");
  return res.json();
}

export function ExploreFeed({ initialData, viewerId }: { initialData: PortalFeedData; viewerId?: string }) {
  const { data } = useQuery({
    queryKey: ["explore-feed"],
    queryFn: fetchPortalFeed,
    initialData,
    staleTime: 180_000,
    refetchOnWindowFocus: true,
  });

  const { popular, latest, locations, categories, topRated } = data;

  return (
    <div className="p-4 md:p-8 -mt-4 space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-800">💖 人気の旅スポット</h2>
          <Link href="/search?tab=post&sort=popular" className="text-sm text-[#16a34a] font-medium hover:underline">
            もっと見る
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {popular.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} />
          ))}
        </div>
      </section>

      <AreaSection areas={locations} />

      <CategorySection categories={categories} />

      <TopRatedSection posts={topRated} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-800">✨ 新着の旅スポット</h2>
          <Link href="/search?tab=post" className="text-sm text-[#16a34a] font-medium hover:underline">
            もっと見る
          </Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {latest.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} />
          ))}
        </div>
      </section>

      <HighlightedPostScroller />
    </div>
  );
}
