import { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  findPostsByAuthorIdService,
  findWishlistedPostsService,
  findVisitedPostsService,
  findFollowingPostsService,
  countFollowingFeedPostsService,
} from "@/lib/services/post.service";
import { findPlansByUserIdService, countActivePlansByUserService } from "@/lib/services/plan.service";
import { getAvailableYearsService, getYearlyStatsService, getTimelineService } from "@/lib/services/stats.service";
import { countUserPostsService, countVisitedByUserService } from "@/lib/services/user.service";
import { countWishlistByUserService } from "@/lib/services/wishlist.service";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportSummary } from "@/components/plans/ReportSummary";
import { ReportTimeline } from "@/components/plans/ReportTimeline";
import { PlanActions } from "@/components/plans/PlanActions";
import { CompletedPlansAccordion } from "@/components/plans/CompletedPlansAccordion";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import type { Post } from "@/types/post";
import type { Plan } from "@/types/plan";

export const metadata: Metadata = { title: "マイページ — TripDiary" };

type Props = {
  searchParams: Promise<{ tab?: string; year?: string }>;
};

const TABS = [
  { key: "plans", icon: "1f9ed", label: "旅行プラン" },
  { key: "myposts", icon: "1f4da", label: "自分の投稿" },
  { key: "report", icon: "1f4cb", label: "旅行レポート" },
  { key: "wishlist", icon: "1f516", label: "行きたい" },
  { key: "visited", icon: "1f6a9", label: "訪問済み" },
  { key: "follow-feed", icon: "1f465", label: "フォロー中の投稿" },
] as const;

const TAB_INFO: Record<string, { icon: string; label: string }> = Object.fromEntries(
  TABS.map((t) => [t.key, { icon: t.icon, label: t.label }])
);

export default async function MyPage({ searchParams }: Props) {
  const { tab = "myposts", year: yearParam } = await searchParams;
  const session = await auth();
  const userId = session!.user.id!;

  const activeTab = TABS.some((t) => t.key === tab) ? tab : "myposts";

  const [postCount, wishlistCount, visitedCount, followFeedCount, activePlanCount] = await Promise.all([
    countUserPostsService(userId),
    countWishlistByUserService(userId),
    countVisitedByUserService(userId),
    countFollowingFeedPostsService(userId),
    countActivePlansByUserService(userId),
  ]);

  const counts: Record<string, number> = {
    plans: activePlanCount,
    myposts: postCount,
    wishlist: wishlistCount,
    visited: visitedCount,
    "follow-feed": followFeedCount,
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="flex items-center gap-4 text-2xl font-bold text-[#1e293b]">
          <span className="flex items-center gap-2">
            <TwemojiIcon codepoint={TAB_INFO[activeTab].icon} className="h-6 w-6" />
            {TAB_INFO[activeTab].label}
          </span>
          {activeTab !== "report" && counts[activeTab] > 0 && (
            <span className="inline-flex items-center h-7 text-[0.85rem] leading-none font-semibold text-[#64748b] bg-[#e5e7eb] rounded-full px-3">
              {counts[activeTab]}
            </span>
          )}
        </h1>
        <span className="rounded-md bg-rose-50 text-rose-800 text-sm px-3 py-1.5 border border-rose-200 border-l-[3px] border-l-rose-500 font-medium shrink-0">
          🔒 この画面は自分のみ表示
        </span>
      </div>

      {/* Tabs（モバイルのみ表示。デスクトップはサイドバーのマイページ各項目から切り替える） */}
      <div className="md:hidden flex gap-1 border-b border-zinc-200 overflow-x-auto overflow-y-hidden">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/mypage?tab=${t.key}`}
            title={t.label}
            className={`flex items-center px-3 py-2 border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-[#16a34a] text-[#16a34a]"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <TwemojiIcon codepoint={t.icon} className="h-5 w-5" />
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "plans" && (await renderPlans(userId))}
        {activeTab === "myposts" && (await renderMyPosts(userId))}
        {activeTab === "report" && (await renderReport(userId, yearParam))}
        {activeTab === "wishlist" && (await renderWishlist(userId))}
        {activeTab === "visited" && (await renderVisited(userId))}
        {activeTab === "follow-feed" && (await renderFollowFeed(userId))}
      </div>
    </div>
  );
}

async function renderReport(userId: string, yearParam?: string) {
  const years = await getAvailableYearsService(userId);
  if (years.length === 0) {
    return <EmptyState codepoint="1f4cb" message="まだ旅の記録がありません" ctaLabel="投稿する" ctaHref="/posts/new" />;
  }

  const parsedYear = yearParam ? Number(yearParam) : NaN;
  const year: number | "all" = years.includes(parsedYear) ? parsedYear : "all";

  const [stats, timeline] = await Promise.all([
    getYearlyStatsService(userId, year === "all" ? null : year),
    getTimelineService(userId),
  ]);

  return (
    <div className="space-y-8">
      <ReportSummary key={year} years={years} initialYear={year} initialStats={stats} />
      <ReportTimeline groups={timeline} />
    </div>
  );
}

function formatDateSlash(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}/${m}/${d}`;
}

function PlanListItem({ plan }: { plan: Plan }) {
  return (
    <div className="group flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-100">
      <Link href={`/plans/${plan.id}`} className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-base font-bold text-zinc-800">
          <TwemojiIcon codepoint="1f9ed" alt="🧭" className="h-5 w-5 shrink-0" /> {plan.title}
        </p>
        {(plan.startDate || plan.endDate) && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-zinc-400">
            <TwemojiIcon codepoint="1f4c5" alt="📅" className="h-3 w-3" />
            {plan.startDate ? formatDateSlash(plan.startDate) : "未定"} 〜{" "}
            {plan.endDate ? formatDateSlash(plan.endDate) : "未定"}
          </p>
        )}
        {plan.memo && <p className="mt-1 truncate text-[13px] text-zinc-500">{plan.memo}</p>}
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[13px] font-semibold text-zinc-500">
          {plan.spotCount ?? 0}スポット
        </span>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <PlanActions planId={plan.id} completed={plan.completed} variant="icons" />
        </div>
      </div>
    </div>
  );
}

async function renderPlans(userId: string) {
  const plans = await findPlansByUserIdService(userId);
  const activePlans = plans.filter((p) => !p.completed);
  const completedPlans = plans.filter((p) => p.completed);

  if (plans.length === 0) {
    return <EmptyState codepoint="1f9ed" message="まだ旅行プランがありません" ctaLabel="プランを作成する" ctaHref="/plans/new" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/plans/new"
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          ＋ 新しいプラン
        </Link>
      </div>
      {activePlans.length === 0 ? (
        <EmptyState codepoint="1f9ed" message="進行中のプランがありません" ctaLabel="プランを作成する" ctaHref="/plans/new" />
      ) : (
        <div className="max-w-5xl space-y-2">
          {activePlans.map((plan) => (
            <PlanListItem key={plan.id} plan={plan as unknown as Plan} />
          ))}
        </div>
      )}
      {completedPlans.length > 0 && (
        <CompletedPlansAccordion count={completedPlans.length}>
          {completedPlans.map((plan) => (
            <PlanListItem key={plan.id} plan={plan as unknown as Plan} />
          ))}
        </CompletedPlansAccordion>
      )}
    </div>
  );
}

async function renderMyPosts(userId: string) {
  const { posts } = await findPostsByAuthorIdService({ authorId: userId, viewerId: userId });
  if (posts.length === 0) {
    return <EmptyState codepoint="1f4da" message="まだ投稿がありません" ctaLabel="投稿する" ctaHref="/posts/new" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} viewerId={userId} showCost />
      ))}
    </div>
  );
}

async function renderWishlist(userId: string) {
  const { posts } = await findWishlistedPostsService({ userId });
  if (posts.length === 0) {
    return <EmptyState codepoint="1f516" message="行きたいリストがまだありません" ctaLabel="スポットを探す" ctaHref="/" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} />
      ))}
    </div>
  );
}

async function renderVisited(userId: string) {
  const { posts } = await findVisitedPostsService({ userId });
  if (posts.length === 0) {
    return <EmptyState codepoint="1f6a9" message="訪問済みのスポットがありません" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} />
      ))}
    </div>
  );
}

async function renderFollowFeed(userId: string) {
  const { posts } = await findFollowingPostsService({ userId });
  if (posts.length === 0) {
    return <EmptyState codepoint="1f465" message="フォロー中のユーザーがいません" ctaLabel="ユーザーを探す" ctaHref="/search?tab=user" />;
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} />
      ))}
    </div>
  );
}
