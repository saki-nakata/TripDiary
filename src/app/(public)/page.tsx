import { PostCard } from "@/components/posts/PostCard";
import { AreaSection } from "@/components/explore/AreaSection";
import { CategorySection } from "@/components/explore/CategorySection";
import { TopRatedSection } from "@/components/explore/TopRatedSection";
import {
  findPopularPosts,
  findLatestPosts,
  findLocationCounts,
  findCategoryCounts,
  findTopRatedByCategory,
} from "@/lib/repositories/post.repository";
import type { Post } from "@/types/post";

export default async function PortalPage() {
  const popular = (await findPopularPosts(6)) as Post[];
  const latest = (await findLatestPosts(6)) as Post[];
  const locations = await findLocationCounts();
  const categories = await findCategoryCounts();
  const topRated = (await findTopRatedByCategory(popular.map((p) => p.id))) as Post[];

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
    </div>
  );
}
