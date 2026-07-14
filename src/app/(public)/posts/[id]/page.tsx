import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { findPostById, findRelatedPosts } from "@/lib/repositories/post.repository";
import { ImageCarousel } from "@/components/posts/ImageCarousel";
import { StarRating } from "@/components/posts/StarRating";
import { LikeButton } from "@/components/posts/LikeButton";
import { WishlistButton } from "@/components/posts/WishlistButton";
import { VisitedButton } from "@/components/posts/VisitedButton";
import { CommentSection } from "@/components/posts/CommentSection";
import { PostCard } from "@/components/posts/PostCard";
import { MapViewWrapper } from "@/components/map/MapViewWrapper";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { BackButton } from "@/components/posts/BackButton";
import { ScrollToHash } from "@/components/posts/ScrollToHash";
import { CATEGORY_COLORS } from "@/lib/constants";
import { CategoryIcon } from "@/components/ui/category-icon";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import type { Post, CostBreakdownItem } from "@/types/post";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const post = await findPostById(id, userId);
  if (!post) notFound();

  const related = await findRelatedPosts(id, post.location, 4);

  const isAuthor = userId === post.authorId;

  const visitedAtDate = new Date(post.visitedAt);
  const visitedDate = `${visitedAtDate.getFullYear()}/${visitedAtDate.getMonth() + 1}/${visitedAtDate.getDate()} (${visitedAtDate.toLocaleDateString("ja-JP", { weekday: "short" })})`;

  return (
    <div className="relative">
      <ScrollToHash />
      <div className="absolute left-0 top-1 z-10 md:left-2">
        <BackButton />
      </div>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-7 -mt-4">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {post.category && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-xs ${
                  CATEGORY_COLORS[post.category] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                <CategoryIcon category={post.category} /> {post.category}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-zinc-500 text-sm">
              <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-3.5 w-3.5" /> {post.location}
            </span>
            <span className="text-zinc-400 text-sm ml-auto">訪問日：{visitedDate}</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 leading-snug">{post.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/users/${post.author.id}`}
              className="flex items-center gap-2 hover:opacity-80"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-200 shrink-0">
                {post.author.image ? (
                  <Image src={post.author.image} alt={post.author.nickname} fill sizes="32px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 font-medium">
                    {post.author.nickname[0]}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-zinc-700">{post.author.nickname}</span>
            </Link>
            <StarRating value={post.rating ?? 0} readonly size="sm" />
            {isAuthor && (
              <div className="ml-auto flex gap-2">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="px-3 py-1 text-sm border border-zinc-200 rounded-lg transition-colors hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                >
                  編集
                </Link>
                <DeleteButton postId={post.id} />
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        {post.images.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <ImageCarousel images={post.images} title={post.title} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <LikeButton
            postId={post.id}
            initialLiked={post.isLiked ?? false}
            initialCount={post._count.likes}
            isLoggedIn={!!userId}
            disabled={isAuthor}
          />
          <WishlistButton
            postId={post.id}
            initialWishlisted={post.isWishlisted ?? false}
            isLoggedIn={!!userId}
          />
          <VisitedButton
            postId={post.id}
            initialVisited={post.isVisited ?? false}
            isLoggedIn={!!userId}
            forcedVisited={isAuthor}
          />
        </div>

        {/* Body */}
        <p className="text-[0.975rem] text-zinc-700 leading-[1.85] whitespace-pre-wrap">{post.body}</p>

        {/* 費用内訳（自分の投稿のみ） */}
        {isAuthor && post.cost != null && post.cost > 0 && (
          <div className="border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="flex items-center gap-1.5 text-base font-semibold text-zinc-800">
                <TwemojiIcon codepoint="1f4b4" alt="💴" className="h-4 w-4" /> 費用内訳
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5">
                <TwemojiIcon codepoint="1f512" alt="🔒" className="h-3 w-3" /> 自分のみ表示
              </span>
            </div>
            <p className="text-sm font-semibold text-zinc-700">合計：¥{post.cost.toLocaleString()}</p>
            {post.costBreakdown && post.costBreakdown.length > 0 && (
              <div className="flex flex-col gap-1 mt-2 text-sm text-zinc-500">
                {post.costBreakdown.map((item: CostBreakdownItem, i: number) => (
                  <span key={i}>
                    {item.label} {item.amount.toLocaleString()}円
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map */}
        {post.lat != null && post.lng != null && (
          <div className="-mt-2 max-w-5xl mx-auto">
            <MapViewWrapper
              lat={post.lat}
              lng={post.lng}
              label={post.title}
              className="h-[280px] w-full rounded-xl border border-sky-200 z-0"
            />
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-base font-semibold text-zinc-800 mb-3">
              <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-4 w-4" /> {post.location}の関連スポット
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((r) => (
                <PostCard key={r.id} post={r as unknown as Post} />
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div id="comments" className="scroll-mt-6">
          <CommentSection
            postId={post.id}
            postAuthorId={post.authorId}
            currentUserId={userId ?? undefined}
          />
        </div>

      </div>
    </div>
  );
}

