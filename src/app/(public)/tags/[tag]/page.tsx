import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findExplorePostsService, findLocationCountsService } from "@/lib/services/post.service";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/empty-state";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { LOCATIONS } from "@/lib/constants";
import type { Post } from "@/types/post";

type Props = {
  params: Promise<{ tag: string }>;
};

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const location = decodeURIComponent(tag);

  if (!LOCATIONS.includes(location as (typeof LOCATIONS)[number])) {
    notFound();
  }

  const session = await auth();
  const [{ posts }, locationCounts] = await Promise.all([
    findExplorePostsService({ location, userId: session?.user?.id, limit: 40 }),
    findLocationCountsService(),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <Link href="/search?tab=area" className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300">
        ← エリア一覧に戻る
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-surface-foreground">
          <TwemojiIcon codepoint="1f4cd" className="h-6 w-6" /> {location}
        </h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{posts.length}件の投稿</span>
      </div>

      {/* エリア切り替えバー */}
      <div className="flex flex-wrap gap-2">
        {locationCounts.map((l) => (
          <Link
            key={l.location}
            href={`/tags/${encodeURIComponent(l.location)}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              l.location === location
                ? "bg-[#15803d] text-white border-[#15803d]"
                : "bg-surface text-zinc-500 dark:text-zinc-400 border-surface-border hover:border-[#16a34a] dark:hover:border-[#4ade80] hover:text-[#15803d] dark:hover:text-[#4ade80]"
            }`}
          >
            {l.location}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState codepoint="1f4cd" message={`${location}の投稿はまだありません`} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p as unknown as Post} />
          ))}
        </div>
      )}
    </div>
  );
}
