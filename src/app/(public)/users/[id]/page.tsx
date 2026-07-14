import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { getUserProfileService } from "@/lib/services/user.service";
import { findPostsByAuthorIdService } from "@/lib/services/post.service";
import {
  findCommentsByAuthor,
  findCommentsReceivedByAuthor,
  countCommentsByAuthor,
  countCommentsReceived,
} from "@/lib/repositories/user.repository";
import { findFollowers, findFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";
import { PostCard } from "@/components/posts/PostCard";
import { FollowButton } from "@/components/users/FollowButton";
import { BackButton } from "@/components/posts/BackButton";
import { EmptyState } from "@/components/ui/empty-state";
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
    countCommentsByAuthor(id),
    isSelf ? countCommentsReceived(id) : Promise.resolve(0),
  ]);

  const TABS = [
    { key: "posts", label: "投稿", count: profile.postCount },
    { key: "comments", label: "投稿したコメント", count: commentsWrittenCount },
    { key: "comments-received", label: "自分へのコメント", count: commentsReceivedCount, selfOnly: true },
    { key: "followers", label: "フォロワー", count: profile.followerCount },
    { key: "following", label: "フォロー中", count: profile.followingCount },
  ] as const;

  const activeTab = tab === "comments-received" && !isSelf ? "posts" : tab;
  const rankColor = TABI_RANK_COLORS[profile.tabiRank] ?? "bg-amber-50 text-amber-700";

  return (
    <div className="relative">
      {!isSelf && (
        <div className="absolute left-0 top-1 z-10 md:left-2">
          <BackButton />
        </div>
      )}
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative w-[100px] h-[100px] rounded-full overflow-hidden bg-zinc-200 shrink-0">
            {profile.image ? (
              <Image src={profile.image} alt={profile.nickname} fill sizes="100px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-500 font-medium">
                {profile.nickname[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">{profile.nickname}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${rankColor}`}>
                🏅 {profile.tabiRank}（{profile.tabiScore}pt）
              </span>
            </div>
            <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">
              {profile.bio || <span className="text-zinc-400">bioが設定されていません</span>}
            </p>
            <div className="flex gap-5 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.postCount}</p>
                <p className="text-xs text-zinc-500 mt-1">投稿</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.followerCount}</p>
                <p className="text-xs text-zinc-500 mt-1">フォロワー</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-zinc-900 leading-none">{profile.followingCount}</p>
                <p className="text-xs text-zinc-500 mt-1">フォロー中</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {isSelf ? (
                <Link
                  href="/settings"
                  className="px-4 py-1.5 rounded-full border border-zinc-200 text-zinc-600 text-sm font-semibold hover:bg-zinc-50 transition-colors"
                >
                  ✏️ プロフィール編集
                </Link>
              ) : (
                <FollowButton
                  userId={profile.id}
                  initialFollowing={profile.followedByCurrentUser}
                  isLoggedIn={!!viewerId}
                />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="-mt-2 flex gap-1 border-b border-zinc-200 overflow-x-auto overflow-y-hidden">
          {TABS.filter((t) => !("selfOnly" in t) || isSelf).map((t) => (
            <Link
              key={t.key}
              href={`/users/${id}?tab=${t.key}`}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? "border-[#16a34a] text-[#16a34a]"
                  : "border-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              }`}
            >
              {t.label} ({t.count})
            </Link>
          ))}
        </div>

        {/* Tab content */}
        <div>
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
  const comments = await findCommentsByAuthor(authorId);
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
            <p className="text-xs text-zinc-400 mt-1">{new Date(c.createdAt).toLocaleDateString("ja-JP")}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function renderCommentsReceived(authorId: string) {
  const comments = await findCommentsReceivedByAuthor(authorId);
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
            <p className="text-xs text-zinc-400 mt-1">{new Date(c.createdAt).toLocaleDateString("ja-JP")}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function renderUserList(userId: string, type: "followers" | "following", viewerId?: string) {
  const users = type === "followers" ? await findFollowers(userId) : await findFollowing(userId);
  if (users.length === 0) {
    return <EmptyState codepoint="1f465" message={type === "followers" ? "フォロワーはまだいません" : "フォロー中のユーザーはいません"} />;
  }

  const followingIds = viewerId ? await findFollowingIdsAmong(viewerId, users.map((u) => u.id)) : [];
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
            <FollowButton userId={u.id} initialFollowing={followingSet.has(u.id)} isLoggedIn={!!viewerId} />
          )}
        </div>
      ))}
    </div>
  );
}
