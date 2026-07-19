import Link from "next/link";
import { CardImage } from "@/components/posts/CardImage";
import type { Post } from "@/types/post";
import { CategoryIcon } from "@/components/ui/category-icon";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { CATEGORY_COLORS } from "@/lib/constants";

export function TopRatedSection({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-800">
        <TwemojiIcon codepoint="2b50" className="h-5 w-5" /> カテゴリ別高評価スポット
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className="rounded-xl overflow-hidden border border-zinc-200 bg-white transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
          >
            <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
              {post.images[0] && (
                <CardImage
                  src={post.images[0].url}
                  alt={post.title}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              )}
              {post.category && (
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs md:text-[0.68rem] xl:text-xs font-semibold ${
                    CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  <CategoryIcon category={post.category} /> {post.category}
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold text-zinc-800 line-clamp-1">{post.title}</p>
              <div className="flex items-center flex-nowrap gap-0.5 xl:gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm lg:text-xs xl:text-sm ${i < (post.rating ?? 0) ? "text-yellow-400" : "text-zinc-200"}`}
                  >
                    ★
                  </span>
                ))}
                <span className="flex items-center gap-1 ml-auto text-[0.68rem] xl:text-[0.78rem] text-[#16a34a] border border-zinc-300 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">
                  <TwemojiIcon codepoint="1f4cd" alt="📍" className="hidden xl:block h-3 w-3" /> {post.location}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
