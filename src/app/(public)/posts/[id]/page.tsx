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
import { CATEGORY_ICONS } from "@/lib/constants";
import type { Post } from "@/types/post";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const post = await findPostById(id, userId);
  if (!post) notFound();

  const related = await findRelatedPosts(id, post.prefecture, 3);

  const isAuthor = userId === post.authorId;

  const visitedDate = new Date(post.visitedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative">
      <div className="px-4 pt-1 md:px-6 md:pt-1">
        <BackButton />
      </div>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-7 -mt-6">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {post.category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium text-xs">
                {CATEGORY_ICONS[post.category] ?? "📍"} {post.category}
              </span>
            )}
            <span className="text-zinc-500 text-sm">📍 {post.prefecture}</span>
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
                  <Image src={post.author.image} alt={post.author.nickname} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 font-medium">
                    {post.author.nickname[0]}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-zinc-700">{post.author.nickname}</span>
            </Link>
            {post.rating && <StarRating value={post.rating} readonly size="sm" />}
            {isAuthor && (
              <div className="ml-auto flex gap-2">
                <Link
                  href={`/posts/${post.id}/edit`}
                  className="px-3 py-1 text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50"
                >
                  編集
                </Link>
                <DeleteButton postId={post.id} />
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        {post.images.length > 0 ? (
          <ImageCarousel images={post.images} title={post.title} />
        ) : (
          <div className="border border-dashed border-zinc-200 rounded-xl bg-zinc-50/30 h-48 flex items-center justify-center text-xs text-zinc-300">
            📷 写真なし
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <LikeButton
            postId={post.id}
            initialLiked={post.isLiked ?? false}
            initialCount={post._count.likes}
            isLoggedIn={!!userId}
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
          />
        </div>

        {/* Body */}
        <p className="text-[0.975rem] text-zinc-700 leading-[1.85] whitespace-pre-wrap">{post.body}</p>

        {/* Map */}
        {post.lat != null && post.lng != null ? (
          <div>
            <p className="text-sm font-semibold text-zinc-700 mb-2">🗺️ 場所</p>
            <MapViewWrapper
              lat={post.lat}
              lng={post.lng}
              label={post.title}
              className="h-64 w-full rounded-xl z-0"
            />
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200 rounded-xl p-4 bg-zinc-50/30">
            <p className="text-sm font-semibold text-zinc-400 mb-2">🗺️ 場所</p>
            <div className="h-32 flex items-center justify-center text-xs text-zinc-300">地図情報なし</div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 ? (
          <div>
            <p className="text-base font-semibold text-zinc-800 mb-3">
              📍 {post.prefecture}の関連スポット
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <PostCard key={r.id} post={r as unknown as Post} />
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200 rounded-xl p-4 bg-zinc-50/30">
            <p className="text-base font-semibold text-zinc-400 mb-2">📍 {post.prefecture}の関連スポット</p>
            <p className="text-xs text-zinc-300">関連スポットなし</p>
          </div>
        )}

        {/* Comments */}
        <div>
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

