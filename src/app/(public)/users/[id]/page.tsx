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
import { findFollowersService, findFollowingService, findFollowingIdsAmongService } from "@/lib/services/follow.service";
import { PostCard } from "@/components/posts/PostCard";
import { FollowButton } from "@/components/users/FollowButton";
import { BackButton } from "@/components/posts/BackButton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateSlash } from "@/lib/date";
import type { Post } from "@/types/post";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const TABI_RANK_COLORS: Record<string, string> = {
  プラチナトラベラー: "bg-violet-100 text-violet-700",
  ゴールドトラベラー: "bg-amber-100 text-amber-700",
  シルバートラベラー: "bg-zinc-200 text-zinc-700",
  ブロンズトラベラー: "bg-orange-100 text-orange-700",
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
  const rankColor = TABI_RANK_COLORS[profile.tabiRank] ?? "bg-amber-50 text-amber-700";

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
            <div className="relative w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] rounded-full overflow-hidden bg-zinc-200 shrink-0">
              {profile.image ? (
                <Image src={profile.image} alt={profile.nickname} fill sizes="100px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-500 font-medium">
                  {profile.nickname[0]}
                </div>
              )}
            </div>
            <div className="sm:hidden flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">{profile.nickname}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${rankColor}`}>
                🏅 {profile.tabiRank}（{profile.tabiScore}pt）
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">{profile.nickname}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${rankColor}`}>
                🏅 {profile.tabiRank}（{profile.tabiScore}pt）
              </span>
            </div>
            <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap break-words">
              {profile.bio || <span className="text-zinc-400">bioが設定されていません</span>}
            </p>
            <div className="flex gap-3 sm:gap-5 mt-3 items-center">
              {/* デスクトップ（従来どおり）: 投稿・フォロワー・フォロー中の素のカウント。
                  フォロワー/フォロー中はデスクトップではタブ側で開く */}
              <div className="hidden sm:block text-center">
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.postCount}</p>
                <p className="text-xs text-zinc-500 mt-1">投稿</p>
              </div>
              <div className="hidden sm:block text-center">
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.followerCount}</p>
                <p className="text-xs text-zinc-500 mt-1">フォロワー</p>
              </div>
              <div className="hidden sm:block text-center">
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.followingCount}</p>
                <p className="text-xs text-zinc-500 mt-1">フォロー中</p>
              </div>
              {/* モバイル（案A）: フォロワー・フォロー中はタップで一覧が開くチップ（投稿数はタブ側に表示） */}
              <Link
                href={`/users/${id}?tab=followers`}
                className={`sm:hidden text-center rounded-xl border px-4 py-1.5 transition-colors active:bg-zinc-200 ${
                  activeTab === "followers" ? "border-[#16a34a] bg-[#dcfce7]" : "border-zinc-200"
                }`}
              >
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.followerCount}</p>
                <p className="text-xs text-zinc-500 mt-1">フォロワー ›</p>
              </Link>
              <Link
                href={`/users/${id}?tab=following`}
                className={`sm:hidden text-center rounded-xl border px-4 py-1.5 transition-colors active:bg-zinc-200 ${
                  activeTab === "following" ? "border-[#16a34a] bg-[#dcfce7]" : "border-zinc-200"
                }`}
              >
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.followingCount}</p>
                <p className="text-xs text-zinc-500 mt-1">フォロー中 ›</p>
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
                    className="flex flex-col items-center gap-0.5 rounded-full border border-zinc-200 px-3 py-1.5 text-[0.65rem] leading-none text-zinc-600 hover:bg-zinc-50 transition-colors"
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
                  className="hidden sm:inline-flex ml-auto px-4 py-1.5 rounded-full border border-zinc-200 text-zinc-600 text-sm font-semibold hover:bg-zinc-50 transition-colors"
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
        <div className="-mt-2 flex justify-center sm:justify-start gap-3 sm:gap-1 md:gap-0.5 lg:gap-1 border-b border-zinc-200 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {TABS.filter((t) => !("selfOnly" in t) || isSelf).map((t) => (
            <Link
              key={t.key}
              href={`/users/${id}?tab=${t.key}`}
              className={`relative rounded-t-lg px-2 sm:px-3 py-2 text-sm md:text-xs lg:text-sm font-medium whitespace-nowrap transition-colors ${
                "desktopOnly" in t ? "max-sm:hidden" : ""
              } ${
                activeTab === t.key
                  ? "text-[#16a34a]"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
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
            <h2 className="sm:hidden mb-3 text-base font-bold text-zinc-800">
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
  const { posts } = await findPostsByAuthorIdService({ authorId, viewerId });
  if (posts.length === 0) {
    return <EmptyState codepoint="2708" message="まだ投稿がありません" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} />
      ))}
    </div>
  );
}

async function renderCommentsWritten(authorId: string) {
  const comments = await findCommentsByAuthorService(authorId);
  if (comments.length === 0) {
    return <EmptyState codepoint="1f4ac" message="まだコメントがありません" />;
  }
  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <Link
          key={c.id}
          href={`/posts/${c.postId}`}
          className="flex gap-3 p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
        >
          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-zinc-200 shrink-0">
            {c.post.images[0] && (
              <Image src={c.post.images[0].url} alt={c.post.title} fill sizes="56px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-400 mb-1">
              『{c.post.title}』（{c.post.author.nickname}）
            </p>
            <p className="text-sm text-zinc-700">{c.body}</p>
            <p className="text-xs text-zinc-400 mt-1">{formatDateSlash(c.createdAt)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function renderCommentsReceived(authorId: string) {
  const comments = await findCommentsReceivedByAuthorService(authorId);
  if (comments.length === 0) {
    return <EmptyState codepoint="1f4ac" message="まだコメントを受け取っていません" />;
  }
  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <Link
          key={c.id}
          href={`/posts/${c.postId}`}
          className="flex gap-3 p-4 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-200 shrink-0">
            {c.author.image ? (
              <Image src={c.author.image} alt={c.author.nickname} fill sizes="40px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500 font-medium">
                {c.author.nickname[0]}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-400 mb-1">
              <span className="font-bold text-zinc-600">{c.author.nickname}</span> さんから『{c.post.title}』へ
            </p>
            <p className="text-sm text-zinc-700">{c.body}</p>
            <p className="text-xs text-zinc-400 mt-1">{formatDateSlash(c.createdAt)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function renderUserList(userId: string, type: "followers" | "following", viewerId?: string) {
  const users = type === "followers" ? await findFollowersService(userId) : await findFollowingService(userId);
  if (users.length === 0) {
    return <EmptyState codepoint="1f465" message={type === "followers" ? "フォロワーはまだいません" : "フォロー中のユーザーはいません"} />;
  }

  const followingIds = viewerId ? await findFollowingIdsAmongService(viewerId, users.map((u) => u.id)) : [];
  const followingSet = new Set(followingIds);

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors"
        >
          <Link href={`/users/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-200 shrink-0">
              {u.image ? (
                <Image src={u.image} alt={u.nickname} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-zinc-500 font-medium">
                  {u.nickname[0]}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">{u.nickname}</p>
              {u.bio && <p className="text-xs text-zinc-500 truncate">{u.bio}</p>}
            </div>
          </Link>
          {viewerId && viewerId !== u.id && (
            <FollowButton userId={u.id} initialFollowing={followingSet.has(u.id)} isLoggedIn={!!viewerId} size="sm" />
          )}
        </div>
      ))}
    </div>
  );
}
