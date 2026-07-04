"use client";

import { useQuery } from "@tanstack/react-query";
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

export function ExploreFeed({ initialData }: { initialData: PortalFeedData }) {
  const { data } = useQuery({
    queryKey: ["explore-feed"],
    queryFn: fetchPortalFeed,
    initialData,
    staleTime: 180_000,
    refetchInterval: 60_000,
  });

  const { popular, latest, locations, categories, topRated } = data;

  return (
    <div className="px-4 pb-4 pt-2 md:px-8 md:pb-8 md:pt-4 space-y-10">
      <section className="space-y-4">
        <h2 className="text-base font-bold text-zinc-800">❤️ 人気の旅スポット</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {popular.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <AreaSection areas={locations} />

      <CategorySection categories={categories} />

      <TopRatedSection posts={topRated} />

      <section className="space-y-4">
        <h2 className="text-base font-bold text-zinc-800">🆕 新着の旅スポット</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {latest.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <HighlightedPostScroller />
    </div>
  );
}
