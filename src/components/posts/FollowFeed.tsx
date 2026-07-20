import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/types/post";
import { CardImage } from "./CardImage";
import { CommentIconLink } from "./CommentIconLink";
import { StarRating } from "./StarRating";
import { CategoryIcon } from "@/components/ui/category-icon";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { CATEGORY_COLORS } from "@/lib/constants";
import { dateGroupLabel, formatRelativeTime } from "@/lib/date";

// 日付セパレータの表示順（新しい順）。dateGroupLabel の戻り値と一致させる
const GROUP_ORDER = ["今日", "昨日", "今週", "今月", "それ以前"] as const;

/**
 * フォロー中のユーザーの投稿フィード。
 * ギャラリーグリッドではなく SNS 風の縦フィード（1カラム / PC 4カラム）で、
 * 「誰が・いつ」を前面に出して読みやすくする。投稿は「今日 / 昨日 / 今週 / 今月 / それ以前」で
 * 日付グループに分けて見出しを挟む。
 */
export function FollowFeed({ posts }: { posts: Post[] }) {
  const now = new Date();

  // 受け取り順（＝新しい順）を保ったまま日付グループへ振り分ける
  const groups = new Map<string, Post[]>();
  for (const post of posts) {
    const label = dateGroupLabel(post.createdAt, now);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(post);
  }
  const orderedGroups = GROUP_ORDER.filter((label) => groups.has(label));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {orderedGroups.map((label) => (
        <section key={label} className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-zinc-500">
            <span className="h-px flex-1 bg-zinc-200" />
            {label}
            <span className="h-px flex-1 bg-zinc-200" />
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {groups.get(label)!.map((post) => (
              <FollowFeedCard key={post.id} post={post} now={now} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FollowFeedCard({ post, now }: { post: Post; now: Date }) {
  const thumbnail = post.images[0]?.url ?? null;
  const category = post.category ?? "その他";

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300"
    >
      {/* 投稿者ヘッダー（誰が・いつ） */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        {post.author.image ? (
          <Image
            src={post.author.image}
            alt={post.author.nickname}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-500">
            {post.author.nickname[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-800" title={post.author.nickname}>
            {post.author.nickname}
          </p>
          <p className="text-xs text-zinc-400">{formatRelativeTime(post.createdAt, now)}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5 text-[0.78rem] font-medium text-[#16a34a]">
          <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-3 w-3" /> {post.location}
        </span>
      </div>

      {/* メイン写真（フィードらしく大きめ。スマホは1カラムで幅が広いぶん縦も少し長めにして見やすくする） */}
      <div className="relative aspect-[4/3] sm:aspect-[3/2] overflow-hidden bg-zinc-100">
        {thumbnail ? (
          <CardImage
            src={thumbnail}
            alt={post.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            containerRatio={4 / 3}
            imgClassName="group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl text-zinc-300">
            <CategoryIcon category={category} />
          </div>
        )}
        {post.category && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
              CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"
            }`}
          >
            <CategoryIcon category={category} /> {post.category}
          </span>
        )}
        {post.images.length > 1 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[0.7rem] text-white">
            <TwemojiIcon codepoint="1f4f8" alt="📸" className="h-3 w-3" /> {post.images.length}
          </span>
        )}
      </div>

      {/* タイトルとエンゲージメント */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-2 text-base font-bold text-zinc-800">{post.title}</p>
        <div className="mt-auto flex items-center gap-3 pt-1 text-[0.82rem] text-zinc-400">
          <span className="flex items-center gap-1">
            <TwemojiIcon codepoint="2764" alt="❤️" className="h-3.5 w-3.5" /> {post._count.likes}
          </span>
          <CommentIconLink postId={post.id} count={post._count.comments} />
          {post.rating ? (
            <span className="ml-auto">
              <StarRating value={post.rating} readonly size="sm" />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
