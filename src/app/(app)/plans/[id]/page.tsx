import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { findPlanByIdService } from "@/lib/services/plan.service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { PlanActions } from "@/components/plans/PlanActions";
import { EmptyState } from "@/components/ui/empty-state";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import { BackButton } from "@/components/posts/BackButton";
import { PlanMapViewWrapper } from "@/components/map/PlanMapViewWrapper";
import type { PlanMapSpot } from "@/components/map/PlanMapView";
import { formatDateSlash } from "@/lib/date";
import type { PlanDetail } from "@/types/plan";

type Props = {
  params: Promise<{ id: string }>;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

function toCircledNumber(n: number) {
  if (n >= 1 && n <= 20) return String.fromCodePoint(0x2460 + n - 1);
  return `${n}`;
}

function formatDateWithWeekday(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}（${weekday}）`;
}

export default async function PlanDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let plan: PlanDetail;
  try {
    plan = (await findPlanByIdService(session.user.id, id)) as unknown as PlanDetail;
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    if (e instanceof ForbiddenError) redirect("/mypage");
    throw e;
  }

  // 投稿とスポットを直接つなぐ外部キーがないため、タイトルの一致でプラン上の番号を推定する
  const spotNumberByTitle = new Map<string, number>();
  plan.spots.forEach((spot, i) => {
    const spotTitle = spot.post?.title ?? spot.freeTitle ?? "";
    if (spotTitle && !spotNumberByTitle.has(spotTitle))
      spotNumberByTitle.set(spotTitle, i + 1);
  });

  const mapSpots: PlanMapSpot[] = plan.spots
    .map((spot, i) => ({
      lat: spot.post?.lat ?? null,
      lng: spot.post?.lng ?? null,
      label: spot.post?.title ?? spot.freeTitle ?? "",
      order: i + 1,
    }))
    .filter((s): s is PlanMapSpot => s.lat != null && s.lng != null);

  return (
    <div className="relative">
      <div className="absolute left-0 top-1 z-10 md:left-2">
        <BackButton />
      </div>
      <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-8 -mt-4">
        {/* pt-9: モバイルは絶対配置のBackButton（top-1、高さ約30px）とタイトルが
            重なるため、その分の余白を確保する（md以上はBackButtonとの間に
            自然な余白があるため不要） */}
        <div className="flex flex-wrap items-start justify-between gap-3 pt-9 md:pt-0">
          <div className="-mt-2">
            <h1 className="text-2xl font-bold text-[#1e293b]">{plan.title}</h1>
            {(plan.startDate || plan.endDate) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                <TwemojiIcon
                  codepoint="1f4c5"
                  alt="📅"
                  className="h-4 w-4"
                />
                {plan.startDate
                  ? formatDateWithWeekday(plan.startDate)
                  : "未定"}{" "}
                〜 {plan.endDate ? formatDateWithWeekday(plan.endDate) : "未定"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <PlanActions planId={plan.id} completed={plan.completed} />
          </div>
        </div>

        {plan.memo && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="whitespace-pre-wrap text-sm text-zinc-700">
              {plan.memo}
            </p>
          </div>
        )}

        {/* 予算 */}
        <div className="rounded-xl border border-zinc-200 p-4">
          <div className="flex items-baseline gap-2">
            <p className="flex items-center gap-1.5 text-base font-bold text-zinc-700">
              <TwemojiIcon codepoint="1f4b4" alt="💴" className="h-4 w-4" />{" "}
              予算
            </p>
            <p className="text-xl font-semibold text-zinc-800">
              {plan.budget ? `¥${plan.budget.toLocaleString()}` : "—"}
            </p>
          </div>
          {plan.budgetBreakdown && plan.budgetBreakdown.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {plan.budgetBreakdown.map((item, i) => (
                <span
                  key={i}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
                >
                  {item.label} {item.amount.toLocaleString()}円
                </span>
              ))}
            </div>
          )}
        </div>

        {/* スポット一覧 */}
        <div className="space-y-2">
          <p className="text-sm font-bold text-zinc-700">プランのスポット</p>
          {plan.spots.length === 0 ? (
            <EmptyState
              codepoint="1f5fa"
              message="まだスポットが登録されていません"
            />
          ) : (
            <ul className="space-y-2">
              {plan.spots.map((spot, i) => {
                const title = spot.post?.title ?? spot.freeTitle ?? "";
                const location = spot.post?.location ?? spot.freeLocation ?? "";
                const category =
                  spot.post?.category ?? spot.freeCategory ?? null;
                const image = spot.post?.images[0];
                return (
                  <li
                    key={spot.post?.id ?? `free-${i}`}
                    className="flex items-center gap-1.5 sm:gap-3 rounded-xl border border-zinc-200 bg-white p-3"
                  >
                    <span className="-ml-1 sm:ml-0 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image.url}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-lg">
                        <CategoryIcon category={category ?? "その他"} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800">
                        {title}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-xs text-zinc-400">
                        {location && (
                          <>
                            <TwemojiIcon
                              codepoint="1f4cd"
                              alt="📍"
                              className="h-2.5 w-2.5"
                            />{" "}
                            {location}
                          </>
                        )}
                        {category ? (
                          <>
                            {" / "}
                            <CategoryIcon category={category} /> {category}
                          </>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/posts/new?planId=${plan.id}&presetTitle=${encodeURIComponent(title)}&presetLocation=${encodeURIComponent(location)}&presetCategory=${encodeURIComponent(category ?? "")}${image ? `&presetImageUrl=${encodeURIComponent(image.url)}` : ""}`}
                      className="-mr-1 sm:mr-0 flex shrink-0 items-center gap-1 rounded-lg bg-green-50 px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <span className="sm:hidden flex flex-col items-center leading-tight">
                        <span className="flex items-center gap-1">
                          <TwemojiIcon codepoint="1f4dd" alt="📝" className="h-3 w-3" />
                          旅
                        </span>
                        を記録
                      </span>
                      <span className="hidden sm:flex items-center gap-1">
                        <TwemojiIcon codepoint="1f4dd" alt="📝" className="h-3 w-3" />
                        旅を記録
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* スポット地図 */}
        {mapSpots.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-700">
              <TwemojiIcon codepoint="1f5fa" alt="🗺️" className="h-4 w-4" /> スポット地図
            </p>
            <PlanMapViewWrapper spots={mapSpots} />
          </div>
        )}

        {/* リンク済み投稿 */}
        {plan.linkedPosts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-zinc-700">
              このプランで訪れた記録
            </p>
            <ul className="space-y-2">
              {plan.linkedPosts.map((post) => {
                const spotNumber = spotNumberByTitle.get(post.title);
                return (
                  <li key={post.id}>
                    <Link
                      href={`/posts/${post.id}`}
                      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:bg-zinc-50 transition-colors"
                    >
                      {post.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.images[0].url}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover mt-2 sm:mt-0"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-lg mt-2 sm:mt-0">
                          <CategoryIcon category={post.category ?? "その他"} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        {spotNumber && (
                          <div className="sm:hidden flex justify-end mb-1 -mt-1">
                            <span className="shrink-0 rounded-full border border-green-500 px-2 py-0.5 text-[11px] text-zinc-800">
                              プランのスポット{toCircledNumber(spotNumber)}
                            </span>
                          </div>
                        )}
                        <p className="min-w-0 truncate text-sm font-medium text-zinc-800 -mt-1 sm:mt-0">
                          {post.title}
                        </p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-zinc-400">
                          <TwemojiIcon
                            codepoint="1f4cd"
                            alt="📍"
                            className="h-2.5 w-2.5"
                          />{" "}
                          {post.location}
                          {post.category && (
                            <>
                              {" / "}
                              <CategoryIcon category={post.category} />{" "}
                              {post.category}
                            </>
                          )}
                          <TwemojiIcon
                            codepoint="1f4c5"
                            alt="📅"
                            className="ml-1.5 h-3.5 w-3.5"
                          />{" "}
                          <span className="text-xs font-bold text-zinc-500">
                            {formatDateSlash(post.visitedAt)}
                          </span>
                        </p>
                      </div>
                      {spotNumber && (
                        <span className="hidden sm:inline-block shrink-0 rounded-full border border-green-500 px-2 py-0.5 text-[11px] text-zinc-800">
                          プランのスポット{toCircledNumber(spotNumber)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
