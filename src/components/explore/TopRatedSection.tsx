import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/post";
import { CATEGORY_ICONS } from "@/lib/constants";

export function TopRatedSection({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-zinc-800">⭐ カテゴリ別高評価スポット</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className="rounded-xl overflow-hidden border border-zinc-200 hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-[4/3] bg-zinc-100">
              {post.images[0] && (
                <Image
                  src={post.images[0].url}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
              )}
              {post.category && (
                <span className="absolute top-2 left-2 bg-white/90 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {CATEGORY_ICONS[post.category] ?? "📍"} {post.category}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-zinc-800 line-clamp-1">{post.title}</p>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < (post.rating ?? 0) ? "text-yellow-400" : "text-zinc-200"}>★</span>
                ))}
                <span className="text-xs text-zinc-400 ml-1">📍 {post.location}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
