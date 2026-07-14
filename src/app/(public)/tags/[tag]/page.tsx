import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { findExplorePosts, findLocationCounts } from "@/lib/repositories/post.repository";
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
    findExplorePosts({ location, userId: session?.user?.id, limit: 40 }),
    findLocationCounts(),
  ]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <Link href="/search?tab=area" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← エリア一覧に戻る
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1e293b]">
          <TwemojiIcon codepoint="1f4cd" className="h-6 w-6" /> {location}
        </h1>
        <span className="text-sm text-zinc-500">{posts.length}件の投稿</span>
      </div>

      {/* エリア切り替えバー */}
      <div className="flex flex-wrap gap-2">
        {locationCounts.map((l) => (
          <Link
            key={l.location}
            href={`/tags/${encodeURIComponent(l.location)}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              l.location === location
                ? "bg-[#16a34a] text-white border-[#16a34a]"
                : "bg-white text-zinc-500 border-zinc-200 hover:border-[#16a34a] hover:text-[#16a34a]"
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
