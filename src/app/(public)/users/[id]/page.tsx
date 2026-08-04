import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import {
  getUserProfileService,
  findCommentsByAuthorService,
  findCommentsReceivedByAuthorService,
  countCommentsByAuthorService,
  countCommentsReceivedService,
} from "@/lib/services/user.service";
import { findPostsByAuthorIdService } from "@/lib/services/post.service";
import { findFollowersService, findFollowingService } from "@/lib/services/follow.service";
import { LoadMoreList } from "@/components/posts/LoadMoreList";
import { FollowButton } from "@/components/users/FollowButton";
import { BackButton } from "@/components/posts/BackButton";
import { EmptyState } from "@/components/ui/empty-state";
import { CommentLoadMoreList } from "@/components/users/CommentLoadMoreList";
import { UserLoadMoreList } from "@/components/users/UserLoadMoreList";
import type { Post } from "@/types/post";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const TABI_RANK_COLORS: Record<string, string> = {
  プラチナトラベラー: "bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-400",
  ゴールドトラベラー: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
  シルバートラベラー: "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300",
  ブロンズトラベラー: "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400",
};

export default async function UserProfilePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab = "posts" } = await searchParams;
  const session = await auth();
  const viewerId = session?.user?.id;
  const isSelf = viewerId === id;

  let profile;
  try {
    profile = await getUserProfileService(id, viewerId);
  } catch {
    notFound();
  }

  const [commentsWrittenCount, commentsReceivedCount] = await Promise.all([
    countCommentsByAuthorService(id),
    isSelf ? countCommentsReceivedService(id) : Promise.resolve(0),
  ]);

  // フォロワー・フォロー中は、モバイルのみ Instagram/X と同様にヘッダーの数字タップで開く
  // （desktopOnly タブは max-sm:hidden でモバイルでは隠す）。デスクトップは従来どおりタブで表示。
  const TABS = [
    { key: "posts", label: "投稿", count: profile.postCount },
    { key: "comments", label: "投稿したコメント", shortLabel: "コメント", count: commentsWrittenCount },
    { key: "comments-received", label: "自分へのコメント", shortLabel: "自分宛", count: commentsReceivedCount, selfOnly: true },
    { key: "followers", label: "フォロワー", count: profile.followerCount, desktopOnly: true },
    { key: "following", label: "フォロー中", count: profile.followingCount, desktopOnly: true },
  ] as const;

  const activeTab = tab === "comments-received" && !isSelf ? "posts" : tab;
  const rankColor = TABI_RANK_COLORS[profile.tabiRank] ?? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400";

  return (
    <div className="relative">
      {!isSelf && (
        <div className="absolute left-0 top-0 z-10 md:left-2">
          <BackButton />
        </div>
      )}
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
        {/* Header */}
        {/* pt-4: スマホ用の余白。md〜lg（768〜1279px、iPad Pro縦向き含む）は
            コンテナのパディングが p-8 でも -mt-4 と相殺すると余白が足りず重なる
            ため pt-9 に広げ、本当にPC幅と言える xl（1280px）で解除する */}
        <div className={`flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-4 ${!isSelf ? "pt-5 md:pt-3 lg:pt-1 xl:pt-0" : ""}`}>
          <div className="flex items-center gap-4">
            <div className="relative w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0">
              {profile.image ? (
                <Image src={profile.image} alt={profile.nickname} fill sizes="100px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-500 dark:text-zinc-400 font-medium">
                  {profile.nickname[0]}
                </div>
              )}
            </div>
            <div className="sm:hidden flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-surface-foreground">{profile.nickname}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${rankColor}`}>
                🏅 {profile.tabiRank}（{profile.tabiScore}pt）
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-surface-foreground">{profile.nickname}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${rankColor}`}>
                🏅 {profile.tabiRank}（{profile.tabiScore}pt）
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 whitespace-pre-wrap break-words">
              {profile.bio || <span className="text-zinc-400">bioが設定されていません</span>}
            </p>
            <div className="flex gap-3 sm:gap-5 mt-3 items-center">
              {/* デスクトップ（従来どおり）: 投稿・フォロワー・フォロー中の素のカウント。
                  フォロワー/フォロー中はデスクトップではタブ側で開く */}
              <div className="hidden sm:block text-center">
                <p className="text-lg font-bold text-surface-foreground leading-none">{profile.postCount}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">投稿</p>
              </div>
              <div className="hidden sm:block text-center">
                <p className="text-lg font-bold text-surface-foreground leading-none">{profile.followerCount}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">フォロワー</p>
              </div>
              <div className="hidden sm:block text-center">
                <p className="text-lg font-bold text-surface-foreground leading-none">{profile.followingCount}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">フォロー中</p>
              </div>
              {/* モバイル（案A）: フォロワー・フォロー中はタップで一覧が開くチップ（投稿数はタブ側に表示） */}
              <Link
                href={`/users/${id}?tab=followers`}
                className={`sm:hidden text-center rounded-xl border px-4 py-1.5 transition-colors active:bg-zinc-200 dark:active:bg-zinc-700 ${
                  activeTab === "followers" ? "border-[#16a34a] dark:border-[#4ade80] bg-[#dcfce7] dark:bg-green-950" : "border-surface-border"
                }`}
              >
                <p className="text-lg font-bold text-surface-foreground leading-none">{profile.followerCount}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">フォロワー ›</p>
              </Link>
              <Link
                href={`/users/${id}?tab=following`}
                className={`sm:hidden text-center rounded-xl border px-4 py-1.5 transition-colors active:bg-zinc-200 dark:active:bg-zinc-700 ${
                  activeTab === "following" ? "border-[#16a34a] dark:border-[#4ade80] bg-[#dcfce7] dark:bg-green-950" : "border-surface-border"
                }`}
              >
                <p className="text-lg font-bold text-surface-foreground leading-none">{profile.followingCount}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">フォロー中 ›</p>
              </Link>
              {!isSelf && (
                <div className="sm:hidden ml-auto mr-2 scale-110 origin-right">
                  <FollowButton
                    userId={profile.id}
                    initialFollowing={profile.followedByCurrentUser}
                    isLoggedIn={!!viewerId}
                    size="sm"
                  />
                </div>
              )}
              {isSelf && (
                <div className="sm:hidden ml-auto mr-1 -mt-2">
                  <Link
                    href="/settings"
                    className="flex flex-col items-center gap-0.5 rounded-full border border-surface-border px-3 py-1.5 text-[0.65rem] leading-none text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span>✏️</span>
                    <span>プロフィール編集</span>
                  </Link>
                </div>
              )}
              {/* デスクトップ: プロフィール編集はカウント行の右寄せ（本人のみ） */}
              {isSelf && (
                <Link
                  href="/settings"
                  className="hidden sm:inline-flex ml-auto px-4 py-1.5 rounded-full border border-surface-border text-zinc-600 dark:text-zinc-400 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors"
                >
                  ✏️ プロフィール編集
                </Link>
              )}
            </div>
            {/* デスクトップの非本人フォローボタン（本人のプロフィール編集はカウント行へ移動） */}
            {!isSelf && (
              <div className="mt-3 hidden sm:block">
                <FollowButton
                  userId={profile.id}
                  initialFollowing={profile.followedByCurrentUser}
                  isLoggedIn={!!viewerId}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="-mt-2 flex justify-center sm:justify-start gap-3 sm:gap-1 md:gap-0.5 lg:gap-1 border-b border-surface-border overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {TABS.filter((t) => !("selfOnly" in t) || isSelf).map((t) => (
            <Link
              key={t.key}
              href={`/users/${id}?tab=${t.key}`}
              className={`relative rounded-t-lg px-2 sm:px-3 py-2 text-sm md:text-xs lg:text-sm font-medium whitespace-nowrap transition-colors ${
                "desktopOnly" in t ? "max-sm:hidden" : ""
              } ${
                activeTab === t.key
                  ? "text-[#16a34a] dark:text-[#4ade80]"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {/* モバイルは短縮ラベル（あれば）、デスクトップは正式ラベル */}
              <span className="sm:hidden">
                {("shortLabel" in t ? t.shortLabel : t.label)} ({t.count})
              </span>
              <span className="hidden sm:inline">
                {t.label} ({t.count})
              </span>
              {activeTab === t.key && (
                <span className="absolute -bottom-px left-1 right-0 h-1 bg-[#16a34a]" />
              )}
            </Link>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {/* モバイルはフォロワー・フォロー中がタブに無いため、一覧表示時は見出しで文脈を示す
              （デスクトップはタブがアクティブ表示されるので見出しは出さない） */}
          {(activeTab === "followers" || activeTab === "following") && (
            <h2 className="sm:hidden mb-3 text-base font-bold text-surface-foreground">
              {activeTab === "followers"
                ? `フォロワー (${profile.followerCount})`
                : `フォロー中 (${profile.followingCount})`}
            </h2>
          )}
          {activeTab === "posts" && (await renderPosts(id, viewerId))}
          {activeTab === "comments" && (await renderCommentsWritten(id))}
          {activeTab === "comments-received" && isSelf && (await renderCommentsReceived(id))}
          {activeTab === "followers" && (await renderUserList(id, "followers", viewerId))}
          {activeTab === "following" && (await renderUserList(id, "following", viewerId))}
        </div>
      </div>
    </div>
  );
}

async function renderPosts(authorId: string, viewerId?: string) {
  const { posts, nextCursor, hasMore } = await findPostsByAuthorIdService({ authorId, viewerId });
  if (posts.length === 0) {
    return <EmptyState codepoint="2708" message="まだ投稿がありません" />;
  }
  return (
    <LoadMoreList
      initialPosts={posts as unknown as Post[]}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      baseUrl={`/api/users/${authorId}/posts`}
      variant="post-grid"
    />
  );
}

async function renderCommentsWritten(authorId: string) {
  const { comments, nextCursor, hasMore } = await findCommentsByAuthorService({ authorId });
  if (comments.length === 0) {
    return <EmptyState codepoint="1f4ac" message="まだコメントがありません" />;
  }
  return (
    <CommentLoadMoreList
      initialComments={comments}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      baseUrl={`/api/users/${authorId}/comments`}
      variant="written"
    />
  );
}

async function renderCommentsReceived(authorId: string) {
  const { comments, nextCursor, hasMore } = await findCommentsReceivedByAuthorService({ authorId });
  if (comments.length === 0) {
    return <EmptyState codepoint="1f4ac" message="まだコメントを受け取っていません" />;
  }
  return (
    <CommentLoadMoreList
      initialComments={comments}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      baseUrl={`/api/users/${authorId}/comments-received`}
      variant="received"
    />
  );
}

async function renderUserList(userId: string, type: "followers" | "following", viewerId?: string) {
  const { users, nextCursor, hasMore } =
    type === "followers"
      ? await findFollowersService({ userId, viewerId })
      : await findFollowingService({ userId, viewerId });
  if (users.length === 0) {
    return <EmptyState codepoint="1f465" message={type === "followers" ? "フォロワーはまだいません" : "フォロー中のユーザーはいません"} />;
  }

  return (
    <UserLoadMoreList
      initialUsers={users}
      initialNextCursor={nextCursor}
      initialHasMore={hasMore}
      baseUrl={`/api/users/${userId}/${type}`}
      viewerId={viewerId}
    />
  );
}
