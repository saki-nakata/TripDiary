import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/post";
import { StarRating } from "./StarRating";
import { CATEGORY_COLORS } from "@/lib/constants";
import { CategoryIcon } from "@/components/ui/category-icon";
import { MyPostActions } from "./MyPostActions";
import { PostCardTitle } from "./PostCardTitle";
import { CommentIconLink } from "./CommentIconLink";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { formatDateSlash } from "@/lib/date";
import styles from "./PostCard.module.css";

type Props = {
  post: Post;
  /** ログイン中ユーザーのID。post.authorId と一致する場合のみホバー編集・削除ボタンを表示する */
  viewerId?: string;
  /** true の場合、自分の投稿カードに費用を表示する（マイページの自分の投稿タブでのみ使用） */
  showCost?: boolean;
  /** true の場合、モバイルのみニックネーム/エリア/日付/いいね・コメント数を4行に分けて表示する
   *  （投稿詳細ページの関連スポット専用。他の一覧では使わない） */
  compactMobileMeta?: boolean;
};

export function PostCard({ post, viewerId, showCost = false, compactMobileMeta = false }: Props) {
  const isOwner = viewerId != null && viewerId === post.authorId;
  const thumbnail = post.images[0]?.url ?? null;
  const category = post.category ?? "その他";

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
            <CategoryIcon category={category} />
          </div>
        )}
        {post.category && (
          <span
            className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium ${
              CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            <CategoryIcon category={category} /> {post.category}
          </span>
        )}
        {post.images.length > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white text-[0.7rem] px-1.5 py-0.5 rounded">
            <TwemojiIcon codepoint="1f4f8" alt="📸" className="h-3 w-3" /> {post.images.length}
          </span>
        )}
        {isOwner && <MyPostActions postId={post.id} />}
      </div>

      <div className="flex flex-col flex-1 gap-2 p-4">
        <PostCardTitle title={post.title} />

        {compactMobileMeta && (
          <div className="sm:hidden flex flex-col gap-1 text-[0.82rem] text-zinc-500">
            <div className="flex items-center gap-1.5 min-w-0">
              {post.author.image ? (
                <Image
                  src={post.author.image}
                  alt={post.author.nickname}
                  width={22}
                  height={22}
                  className="w-[22px] h-[22px] rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-[22px] h-[22px] rounded-full bg-zinc-200 flex items-center justify-center text-[10px] text-zinc-500 font-medium shrink-0">
                  {post.author.nickname[0]}
                </div>
              )}
              <span className="truncate" title={post.author.nickname}>{post.author.nickname}</span>
            </div>
            <span className="flex items-center gap-1 w-fit text-[0.78rem] text-[#16a34a] border border-zinc-300 rounded-full px-2 py-0.5 font-medium">
              <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-3 w-3" /> {post.location}
            </span>
            <span>{formatDateSlash(post.createdAt)}</span>
            <div className="flex items-center gap-3 text-zinc-400">
              <span className="flex items-center gap-1">
                <TwemojiIcon codepoint="2764" alt="❤️" className="h-3.5 w-3.5" /> {post._count.likes}
              </span>
              <CommentIconLink postId={post.id} count={post._count.comments} />
            </div>
          </div>
        )}

        <div className={`${compactMobileMeta ? "hidden sm:flex" : "flex"} items-center gap-1.5 text-[0.82rem] text-zinc-500 min-w-0 flex-wrap`}>
          {post.author.image ? (
            <Image
              src={post.author.image}
              alt={post.author.nickname}
              width={22}
              height={22}
              className="w-[22px] h-[22px] rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-[22px] h-[22px] rounded-full bg-zinc-200 flex items-center justify-center text-[10px] text-zinc-500 font-medium shrink-0">
              {post.author.nickname[0]}
            </div>
          )}
          <span className="truncate max-w-[6.5rem]" title={post.author.nickname}>{post.author.nickname}</span>
          <span className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1 text-[0.78rem] text-[#16a34a] border border-zinc-300 rounded-full px-2 py-0.5 font-medium">
              <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-3 w-3" /> {post.location}
            </span>
            {showCost && post.cost != null && post.cost > 0 && (
              <span className="flex items-center gap-1 text-[0.78rem] text-zinc-500 font-medium">
                <TwemojiIcon codepoint="1f4b4" alt="💴" className="h-3 w-3" /> {post.cost.toLocaleString()}円
              </span>
            )}
          </span>
        </div>

        <div className={`${compactMobileMeta ? "hidden sm:flex" : "flex"} items-center flex-wrap gap-x-2 gap-y-1 text-[0.82rem] text-zinc-400 mt-auto pt-1`}>
          <span className="flex items-center gap-1">
            <TwemojiIcon codepoint="2764" alt="❤️" className="h-3.5 w-3.5" /> {post._count.likes}
          </span>
          <CommentIconLink postId={post.id} count={post._count.comments} />
          {post.rating ? (
            <span className="sm:mx-auto">
              <StarRating value={post.rating} readonly size="sm" />
            </span>
          ) : null}
          <span className={`ml-auto text-zinc-500 ${compactMobileMeta ? "text-xs" : "text-[0.82rem]"}`}>
            {formatDateSlash(post.createdAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
