import Link from "next/link";
import { PostCard } from "@/components/posts/PostCard";
import { findPopularPosts, findLatestPosts } from "@/lib/repositories/post.repository";
import type { Post } from "@/types/post";

async function PopularSection() {
  const posts = await findPopularPosts(6) as Post[];
  if (posts.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-800">❤️ 人気の旅スポット</h2>
        <Link href="/?sort=popular" className="text-sm text-green-600 hover:underline">
          もっと見る
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

async function LatestSection() {
  const posts = await findLatestPosts(6) as Post[];
  if (posts.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-800">🆕 新着の旅スポット</h2>
        <Link href="/?sort=latest" className="text-sm text-green-600 hover:underline">
          もっと見る
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  return (
    <div className="bg-[#f7fdf9] -mx-10 -mt-6 px-10 pt-6 pb-10 min-h-screen">
      <div className="space-y-10">
        <PopularSection />
        <LatestSection />
      </div>
    </div>
  );
}
