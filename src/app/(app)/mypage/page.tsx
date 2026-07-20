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
import { getAvailableYearsService, getYearlyStatsService } from "@/lib/services/stats.service";
import { countUserPostsService, countVisitedByUserService } from "@/lib/services/user.service";
import { countWishlistByUserService } from "@/lib/services/wishlist.service";
import { PostCard } from "@/components/posts/PostCard";
import { SavedMapSection } from "@/components/posts/SavedMapSection";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportSummary } from "@/components/plans/ReportSummary";
import { FollowFeed } from "@/components/posts/FollowFeed";
import { PlanActions } from "@/components/plans/PlanActions";
import { CompletedPlansAccordion } from "@/components/plans/CompletedPlansAccordion";
import { YearFilterBar } from "@/components/mypage/YearFilterBar";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { formatDateSlash } from "@/lib/date";
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

  // 自分の投稿タブの年度切り替え。カウントバッジ・ヘッダーの年度セレクター・
  // 一覧の絞り込みすべてで同じ year を使い回すため、ここで一度だけ解決する
  const myPostsYears = activeTab === "myposts" ? await getAvailableYearsService(userId) : [];
  const parsedMyPostsYear = yearParam ? Number(yearParam) : NaN;
  const myPostsYear: number | "all" = myPostsYears.includes(parsedMyPostsYear) ? parsedMyPostsYear : "all";

  // 旅行レポートタブの年度切り替え。ヘッダーの年度セレクターとレポート本体で同じ year を使い回す
  const reportYears = activeTab === "report" ? await getAvailableYearsService(userId) : [];
  const parsedReportYear = yearParam ? Number(yearParam) : NaN;
  const reportYear: number | "all" = reportYears.includes(parsedReportYear) ? parsedReportYear : "all";

  const [postCount, wishlistCount, visitedCount, followFeedCount, activePlanCount] = await Promise.all([
    countUserPostsService(userId, myPostsYear === "all" ? undefined : myPostsYear),
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
        <div
          className={`basis-full sm:basis-auto flex items-center gap-3 -mt-2 sm:mt-0 -mr-1 sm:mr-0 ${
            (activeTab === "myposts" && myPostsYears.length > 0) || (activeTab === "report" && reportYears.length > 0)
              ? "justify-between sm:justify-end"
              : "justify-end"
          }`}
        >
          {activeTab === "myposts" && myPostsYears.length > 0 && (
            <div className="sm:hidden">
              <YearFilterBar tab="myposts" years={myPostsYears} value={myPostsYear} />
            </div>
          )}
          {activeTab === "report" && reportYears.length > 0 && (
            <div className="sm:hidden">
              <YearFilterBar tab="report" years={reportYears} value={reportYear} />
            </div>
          )}
          <span className="rounded-md bg-rose-50 text-rose-800 text-xs sm:text-sm px-3 py-1.5 border border-rose-200 border-l-[3px] border-l-rose-500 font-medium shrink-0">
            🔒 この画面は自分のみ表示
          </span>
        </div>
      </div>
      {activeTab === "myposts" && myPostsYears.length > 0 && (
        <div className="hidden sm:flex justify-start -mt-4">
          <YearFilterBar tab="myposts" years={myPostsYears} value={myPostsYear} />
        </div>
      )}
      {activeTab === "report" && reportYears.length > 0 && (
        <div className="hidden sm:flex justify-start -mt-4">
          <YearFilterBar tab="report" years={reportYears} value={reportYear} />
        </div>
      )}

      {/* Tab content */}
      <div>
        {activeTab === "plans" && (await renderPlans(userId, yearParam))}
        {activeTab === "myposts" && (await renderMyPosts(userId, myPostsYear))}
        {activeTab === "report" && (await renderReport(userId, reportYears, reportYear))}
        {activeTab === "wishlist" && (await renderSaved(userId, "wishlist"))}
        {activeTab === "visited" && (await renderSaved(userId, "visited"))}
        {activeTab === "follow-feed" && (await renderFollowFeed(userId))}
      </div>
    </div>
  );
}

async function renderReport(userId: string, years: number[], year: number | "all") {
  if (years.length === 0) {
    return <EmptyState codepoint="1f4cb" message="まだ旅の記録がありません" ctaLabel="投稿する" ctaHref="/posts/new" />;
  }

  const stats = await getYearlyStatsService(userId, year === "all" ? null : year);

  return <ReportSummary key={year} years={years} initialYear={year} initialStats={stats} />;
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
        <div className="opacity-100 xl:opacity-0 transition-opacity xl:group-hover:opacity-100">
          <PlanActions planId={plan.id} completed={plan.completed} variant="icons" />
        </div>
      </div>
    </div>
  );
}

async function renderPlans(userId: string, yearParam?: string) {
  const plans = await findPlansByUserIdService(userId);
  const activePlans = plans.filter((p) => !p.completed);
  const completedPlansAll = plans.filter((p) => p.completed);

  // 旅行済みプランの年度切り替え（開始日=startDateの年で判定。未設定のプランは対象外）
  const completedYears = Array.from(
    new Set(completedPlansAll.filter((p) => p.startDate).map((p) => new Date(p.startDate!).getFullYear()))
  ).sort((a, b) => b - a);
  const parsedYear = yearParam ? Number(yearParam) : NaN;
  const year: number | "all" = completedYears.includes(parsedYear) ? parsedYear : "all";
  const completedPlans =
    year === "all" ? completedPlansAll : completedPlansAll.filter((p) => p.startDate && new Date(p.startDate).getFullYear() === year);

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
      {plans.length === 0 ? (
        <EmptyState codepoint="1f9ed" message="まだ旅行プランがありません" />
      ) : activePlans.length === 0 ? (
        <EmptyState codepoint="1f9ed" message="進行中のプランがありません" />
      ) : (
        <div className="max-w-5xl space-y-2">
          {activePlans.map((plan) => (
            <PlanListItem key={plan.id} plan={plan as unknown as Plan} />
          ))}
        </div>
      )}
      {completedPlansAll.length > 0 && (
        <div className="max-w-5xl">
          <CompletedPlansAccordion
            count={completedPlans.length}
            yearFilter={completedYears.length > 0 ? <YearFilterBar tab="plans" years={completedYears} value={year} /> : undefined}
          >
            {completedPlans.length > 0 ? (
              completedPlans.map((plan) => <PlanListItem key={plan.id} plan={plan as unknown as Plan} />)
            ) : (
              <p className="py-6 text-center text-sm text-zinc-400">{year}年の完了済みプランがありません。</p>
            )}
          </CompletedPlansAccordion>
        </div>
      )}
    </div>
  );
}

async function renderMyPosts(userId: string, year: number | "all") {
  const { posts } = await findPostsByAuthorIdService({
    authorId: userId,
    viewerId: userId,
    year: year === "all" ? undefined : year,
  });

  if (posts.length === 0) {
    return (
      <EmptyState
        codepoint="1f4da"
        message={`${year === "all" ? "まだ投稿がありません" : `${year}年の投稿がありません`}`}
        ctaLabel={year === "all" ? "投稿する" : undefined}
        ctaHref={year === "all" ? "/posts/new" : undefined}
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p as unknown as Post} viewerId={userId} />
      ))}
    </div>
  );
}

const SAVED_CONFIG = {
  wishlist: {
    fetch: findWishlistedPostsService,
    empty: { codepoint: "1f516", message: "行きたいリストがまだありません", ctaLabel: "スポットを探す", ctaHref: "/" },
  },
  visited: {
    fetch: findVisitedPostsService,
    empty: { codepoint: "1f6a9", message: "訪問済みのスポットがありません" },
  },
} as const;

async function renderSaved(userId: string, kind: "wishlist" | "visited") {
  const cfg = SAVED_CONFIG[kind];
  const { posts } = await cfg.fetch({ userId });
  if (posts.length === 0) {
    return <EmptyState {...cfg.empty} />;
  }
  return <SavedMapSection posts={posts as unknown as Post[]} kind={kind} />;
}

async function renderFollowFeed(userId: string) {
  const { posts } = await findFollowingPostsService({ userId });
  if (posts.length === 0) {
    return <EmptyState codepoint="1f465" message="フォロー中のユーザーがいません" ctaLabel="ユーザーを探す" ctaHref="/search?tab=user" />;
  }
  return <FollowFeed posts={posts as unknown as Post[]} />;
}
