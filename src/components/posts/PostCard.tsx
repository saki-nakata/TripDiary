import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/post";
import { StarRating } from "./StarRating";
import { CATEGORY_ICONS } from "@/lib/constants";
import styles from "./PostCard.module.css";

type Props = {
  post: Post;
};

export function PostCard({ post }: Props) {
  const thumbnail = post.images[0]?.url ?? null;
  const icon = post.category ? (CATEGORY_ICONS[post.category] ?? "📍") : "📍";

  return (
    <Link
      data-post-id={post.id}
      href={`/posts/${post.id}`}
      className={`${styles.card} group flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden`}
    >
      <div className="relative aspect-[4/3] bg-zinc-100">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-zinc-300">
            {icon}
          </div>
        )}
        {post.category && (
          <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-zinc-700">
            {icon} {post.category}
          </span>
        )}
        {post.images.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[0.7rem] px-1.5 py-0.5 rounded">
            🖼 {post.images.length}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 gap-2 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[0.82rem] text-zinc-500 min-w-0">
            {post.author.image ? (
              <Image
                src={post.author.image}
                alt={post.author.nickname}
                width={22}
                height={22}
                className="rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-[22px] h-[22px] rounded-full bg-zinc-200 flex items-center justify-center text-[10px] text-zinc-500 font-medium shrink-0">
                {post.author.nickname[0]}
              </div>
            )}
            <span className="truncate">{post.author.nickname}</span>
          </div>
          <span className="text-[0.78rem] text-zinc-500 shrink-0 ml-2">
            📍 {post.location}
          </span>
        </div>

        <h3 className="font-bold text-zinc-900 line-clamp-2 text-[0.95rem] leading-snug">
          {post.title}
        </h3>

        {post.rating && (
          <StarRating value={post.rating} readonly size="sm" />
        )}

        <div className="flex items-center gap-3 text-[0.82rem] text-zinc-400 mt-auto pt-1">
          <span>❤️ {post._count.likes}</span>
          <span>💬 {post._count.comments}</span>
          <span className="ml-auto">{new Date(post.createdAt).toLocaleDateString("ja-JP")}</span>
        </div>
      </div>
    </Link>
  );
}
