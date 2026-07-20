"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { StatsResponse } from "@/types/stats";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CardImage } from "@/components/posts/CardImage";
import { formatDateSlash } from "@/lib/date";

type Props = {
  years: number[];
  initialYear: number | "all";
  initialStats: StatsResponse;
};

// Spotify Wrapped風にカードごとに異なるグラデーションを使う（プロトタイプ準拠）
const CARD_GRADIENTS = [
  "from-[#f093fb] to-[#f5576c]",
  "from-[#4facfe] to-[#00f2fe]",
  "from-[#43e97b] to-[#38f9d7]",
  "from-[#fa709a] to-[#fee140]",
  "from-[#a18cd1] to-[#fbc2eb]",
  "from-[#3a3d98] to-[#e94ec7]",
  "from-[#30cfd0] to-[#330867]",
  "from-[#ff9a8b] to-[#ff6a88]",
  "from-[#5f72bd] to-[#9b23ea]",
];

function StatCard({
  codepoint,
  label,
  value,
  delay,
  gradient,
  onClick,
}: {
  codepoint: string;
  label: string;
  value: string;
  delay: number;
  gradient: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`animate-fade-in flex flex-col items-center rounded-2xl border border-transparent bg-gradient-to-br ${gradient} p-3 sm:p-4 text-center text-white shadow-sm transition-all ${onClick ? "cursor-pointer hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md" : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <TwemojiIcon codepoint={codepoint} className="h-6 w-6" />
      <p className="mt-2 text-xl sm:text-2xl font-extrabold [text-shadow:0_2px_8px_rgba(0,0,0,.2)]">{value}</p>
      <p className="text-[0.7rem] sm:text-xs font-medium text-white/80">{label}</p>
    </Tag>
  );
}

function PostCountLineChart({
  data,
  max,
  gradientId,
  labelFormatter,
  rotateLabelsOnMobile = false,
  unit = "件",
}: {
  data: { key: string | number; label: string; count: number }[];
  max: number;
  gradientId: string;
  labelFormatter: (d: { key: string | number; label: string; count: number }) => string;
  rotateLabelsOnMobile?: boolean;
  unit?: string;
}) {
  if (data.length === 0) return null;

  const width = 100;
  const height = 32;
  const padding = 6;
  const step = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = padding + step * i;
    const y = height - padding - ((height - padding * 2) * d.count) / max;
    return { x, y, d };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const yTicks = [max, Math.round(max / 2), 0];

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-1 sm:gap-2">
        <div className="relative h-32 w-full flex-1">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
            {yTicks.map((t, i) => {
              const y = height - padding - ((height - padding * 2) * t) / max;
              return <line key={i} x1={padding} y1={y} x2={width} y2={y} stroke="#f4f4f5" strokeWidth="0.5" />;
            })}
            <line x1={width} y1={padding} x2={width} y2={height - padding} stroke="#e4e4e7" strokeWidth="0.5" />
            <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="85%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>
          </svg>
          {points.map((p) => (
            <span
              key={p.d.key}
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${(p.x / width) * 100}%`,
                top: `${(p.y / height) * 100}%`,
                backgroundColor: "#ec4899",
                border: "2px solid #facc15",
              }}
            />
          ))}
        </div>
        <div className="flex h-32 w-9 shrink-0 flex-col justify-between py-[6px] text-right text-sm text-zinc-500">
          {yTicks.map((t, i) => (
            <span key={i}>{t}{unit}</span>
          ))}
        </div>
      </div>
      <div className="flex items-stretch gap-1 sm:gap-2">
        <div className={`relative flex-1 ${rotateLabelsOnMobile ? "h-10 sm:h-5" : "h-5"}`}>
          {points.map((p) => (
            <span
              key={p.d.key}
              className={`absolute whitespace-nowrap text-sm text-zinc-500 ${
                rotateLabelsOnMobile
                  ? "origin-top -rotate-45 sm:rotate-0 -translate-x-1/2 sm:-translate-x-1/2 -ml-1.5 sm:ml-0"
                  : "-translate-x-1/2"
              }`}
              style={{ left: `${p.x}%` }}
            >
              {labelFormatter(p.d)}
            </span>
          ))}
        </div>
        <div className="w-9 shrink-0" />
      </div>
    </div>
  );
}

// バブルの色。件数の多い順に並んだデータへ、色相を大きく振った配色を順番に繰り返し割り当てる
// （色自体が濃淡で件数を表すわけではなく、隣り合うバブルが同系色にならないようにするための配色）
const BUBBLE_COLORS = [
  "from-[#f472b6] to-[#6366f1]",
  "from-[#fb923c] to-[#d946ef]",
  "from-[#a3e635] to-[#22d3ee]",
  "from-[#fbbf24] to-[#fb7185]",
  "from-[#2dd4bf] to-[#8b5cf6]",
  "from-[#f87171] to-[#fbbf24]",
  "from-[#60a5fa] to-[#34d399]",
  "from-[#a78bfa] to-[#f472b6]",
  "from-[#22d3ee] to-[#6366f1]",
  "from-[#facc15] to-[#f43f5e]",
  "from-[#4ade80] to-[#3b82f6]",
  "from-[#e879f9] to-[#fb923c]",
];

function LocationBubbleChart({ data }: { data: { location: string; count: number }[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  // 面積が件数に比例するよう平方根スケールでサイズ換算（52px〜116px）
  const sizeOf = (count: number) => 52 + Math.sqrt(count / maxCount) * 64;
  // 「神奈川県」「鹿児島県」等の4文字県名が小さいバブルからはみ出さないよう、円のサイズに応じて文字を詰める
  const nameFontSizeOf = (size: number) => `${Math.max(0.62, Math.min(0.92, size / 118))}rem`;
  const countFontSizeOf = (size: number) => `${Math.max(0.55, Math.min(0.8, size / 135))}rem`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-2">
      {data.map((d, i) => {
        const size = sizeOf(d.count);
        return (
          <Link
            key={d.location}
            href={`/search?tab=area&location=${encodeURIComponent(d.location)}`}
            className={`animate-bubble-float-in flex shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br text-center text-white shadow-sm transition-transform hover:scale-105 ${BUBBLE_COLORS[i % BUBBLE_COLORS.length]}`}
            // まとめカード（最大 delay 0.8s＋0.25s）の演出が終わってから、左のバブルから順にふわっと浮上させる
            style={{
              width: `calc(${size}px * var(--bubble-scale, 1))`,
              height: `calc(${size}px * var(--bubble-scale, 1))`,
              animationDelay: `${1 + Math.min(i * 0.05, 0.9)}s`,
            }}
            title={`${d.location}：${d.count}件`}
          >
            <span
              className="px-1 font-semibold leading-tight"
              style={{ fontSize: `calc(${nameFontSizeOf(size)} * var(--bubble-scale, 1))` }}
            >
              {d.location}
            </span>
            <span
              className="font-medium text-white/80"
              style={{ fontSize: `calc(${countFontSizeOf(size)} * var(--bubble-scale, 1))` }}
            >
              {d.count}件
            </span>
          </Link>
        );
      })}
    </div>
  );
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function TopRatedHighlights({ posts }: { posts: StatsResponse["topRatedPosts"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {posts.map((post, i) => (
        <Link
          key={post.id}
          href={`/posts/${post.id}`}
          className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300"
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
            {post.thumbnail ? (
              <CardImage src={post.thumbnail} alt={post.title} sizes="(max-width: 640px) 100vw, 33vw" containerRatio={4 / 3} />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl text-zinc-300">
                <TwemojiIcon codepoint="1f4f7" alt="📷" className="h-10 w-10" />
              </div>
            )}
            <span className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl shadow-sm">
              {RANK_MEDALS[i] ?? `${i + 1}`}
            </span>
            <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-amber-500 shadow-sm">
              {post.rating}
              <TwemojiIcon codepoint="2b50" alt="★" className="h-3 w-3" />
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-3">
            <p className="line-clamp-1 text-sm font-bold text-zinc-800">{post.title}</p>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex shrink-0 items-center gap-1 truncate text-[0.7rem] font-medium text-green-600">
                  <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-3 w-3" /> {post.location}
                </span>
                <span className="flex items-center gap-1 truncate text-[0.7rem] font-medium text-zinc-500">
                  <CategoryIcon category={post.category ?? "その他"} /> {post.category ?? "その他"}
                </span>
              </div>
              <span className="shrink-0 text-zinc-400">{formatDateSlash(post.visitedAt)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// 月別ヒートマップ（投稿数＝頻度）の配色。単一色相の逐次スケール（淡いピンク→ピンク→明るいピンク、3段階）
const HEAT_LIGHT = [252, 231, 243];
const HEAT_MID = [249, 168, 212];
const HEAT_DARK = [236, 72, 153];

function lerpColor(a: number[], b: number[], t: number) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function activityHeat(count: number, max: number) {
  const t = max > 0 ? count / max : 0;
  const [r, g, b] = t <= 0.5 ? lerpColor(HEAT_LIGHT, HEAT_MID, t * 2) : lerpColor(HEAT_MID, HEAT_DARK, (t - 0.5) * 2);
  // セル単体もStatCard/バブルと同じく左上→右下のグラデーションにする（白寄りの色→本来の色）。
  // 白を多めに混ぜて明暗差をはっきり出す
  const [lr, lg, lb] = lerpColor([255, 255, 255], [r, g, b], 0.25);
  return { gradient: `linear-gradient(135deg, rgb(${lr}, ${lg}, ${lb}), rgb(${r}, ${g}, ${b}))`, t };
}

function ActivityHeatmap({ data }: { data: { key: string | number; label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {data.map((d) => {
          const { gradient, t } = activityHeat(d.count, max);
          return (
            <div key={d.key} className="flex flex-col items-center gap-1">
              <div
                className={`flex aspect-square w-full items-center justify-center rounded-md text-[0.78rem] font-semibold ${
                  d.count === 0 ? "bg-zinc-100 text-zinc-300" : t > 0.75 ? "text-white" : "text-zinc-800"
                }`}
                style={d.count > 0 ? { background: gradient } : undefined}
                title={`${d.label}：${d.count}件`}
                aria-label={`${d.label}：${d.count}件`}
              >
                {d.count > 0 ? `${d.count}件` : ""}
              </div>
              <span className="text-[0.7rem] text-zinc-500">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
        <span>少ない</span>
        <span
          className="h-2.5 w-24 rounded-full"
          style={{
            background: `linear-gradient(to right, rgb(${HEAT_LIGHT.join(",")}), rgb(${HEAT_MID.join(",")}), rgb(${HEAT_DARK.join(",")}))`,
          }}
          aria-hidden
        />
        <span>多い</span>
      </div>
    </div>
  );
}

export function ReportSummary({ years, initialYear, initialStats }: Props) {
  const router = useRouter();
  const year = initialYear;
  const stats = initialStats;

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const yearLabel = year === "all" ? "全期間" : `${year}年`;

  if (stats.totalPosts === 0) {
    return <p className="-mt-3 py-16 text-center text-sm text-zinc-400">{yearLabel}の旅の記録がありません。</p>;
  }

  const maxCategoryCount = Math.max(1, ...stats.categoryBreakdown.map((c) => c.count));
  // 月別ヒートマップ（投稿数）用データ。全期間は年をまたいだ月別（季節性）、単年は当年の月別
  const activityHeatmapData =
    year === "all"
      ? stats.seasonalPostCount.map((m) => ({ key: m.month, label: `${m.month}月`, count: m.count }))
      : stats.monthlyPostCount.map((m) => ({ key: m.month, label: `${m.month}月`, count: m.count }));
  // 折れ線（年別投稿数の推移）用データ。全期間のみ表示（単年は月別ヒートマップと役割が被るため出さない）
  const maxYearlyPostCount = Math.max(1, ...stats.yearlyPostCount.map((y) => y.count));

  // yearlyPostCountは年昇順のため、>= による比較で同数タイの場合は「新しい年」を採用する
  const mostActiveYear =
    stats.yearlyPostCount.length > 0
      ? stats.yearlyPostCount.reduce((best, cur) => (cur.count >= best.count ? cur : best)).year
      : null;

  return (
    <div className="-mt-3 space-y-6">
      <p className="flex items-center gap-1.5 text-lg font-bold text-zinc-800">
        <TwemojiIcon codepoint="1f3c6" alt="🏆" className="h-5 w-5" /> {yearLabel}の旅まとめ
      </p>

      {/* まとめカード（他タブと重複する「訪問スポット数」や地図は排除し、レポート固有の集計値に絞る） */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <StatCard codepoint="1f4da" label="投稿数" value={`${stats.totalPosts}件`} delay={0} gradient={CARD_GRADIENTS[0]} onClick={() => scrollToId("activity-heatmap")} />
        <StatCard codepoint="1f4f8" label="写真枚数" value={`${stats.totalPhotos}枚`} delay={0.1} gradient={CARD_GRADIENTS[1]} onClick={() => router.push("/mypage?tab=myposts")} />
        <StatCard codepoint="1f4cd" label="訪問エリア数" value={`${stats.visitedLocations.length}エリア`} delay={0.2} gradient={CARD_GRADIENTS[2]} onClick={() => scrollToId("area-breakdown")} />
        <StatCard codepoint="1f6a9" label="最多訪問エリア" value={stats.topLocation ?? "—"} delay={0.3} gradient={CARD_GRADIENTS[3]} onClick={() => router.push("/mypage?tab=visited")} />
        <StatCard codepoint="1f3f7" label="カテゴリ数" value={`${stats.categoryBreakdown.length}カテゴリ`} delay={0.4} gradient={CARD_GRADIENTS[4]} onClick={() => scrollToId("category-breakdown")} />
        <StatCard codepoint="1f4d6" label="旅行回数" value={`${stats.completedPlans}回`} delay={0.5} gradient={CARD_GRADIENTS[5]} onClick={() => router.push("/mypage?tab=plans")} />
        <StatCard codepoint="2b50" label="平均評価" value={stats.averageRating != null ? `★${stats.averageRating.toFixed(1)}` : "—"} delay={0.6} gradient={CARD_GRADIENTS[6]} onClick={() => scrollToId("top-rated")} />
        {year === "all" && (
          <>
            <StatCard codepoint="1f30d" label="旅歴" value={`${years.length}年`} delay={0.7} gradient={CARD_GRADIENTS[7]} onClick={() => scrollToId("activity-heatmap")} />
            <StatCard codepoint="1f5fa" label="最も旅した年" value={mostActiveYear != null ? `${mostActiveYear}年` : "—"} delay={0.8} gradient={CARD_GRADIENTS[8]} onClick={() => scrollToId("post-trend")} />
          </>
        )}
      </div>

      {/* エリア別バブルチャート（訪問回数が多いエリアほど大きな円で表示） */}
      {stats.locationBreakdown.length > 0 && (
        <div id="area-breakdown" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
            <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-4 w-4" /> {yearLabel}のエリア別投稿数
          </p>
          <LocationBubbleChart key={stats.year} data={stats.locationBreakdown} />
        </div>
      )}

      {/* 高評価スポットTOP3。棒グラフではなく画像ハイライトカードで見せる（評価分布の置き換え） */}
      {stats.topRatedPosts.length > 0 && (
        <div id="top-rated" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
            <TwemojiIcon codepoint="2b50" alt="⭐" className="h-4 w-4" /> {yearLabel}の高評価スポットTOP3
          </p>
          <TopRatedHighlights posts={stats.topRatedPosts} />
        </div>
      )}

      {/* カテゴリ別バーグラフ */}
      {stats.categoryBreakdown.length > 0 && (
        <div id="category-breakdown" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
            <TwemojiIcon codepoint="1f3f7" alt="🏷️" className="h-4 w-4" /> {yearLabel}のカテゴリ別投稿数
          </p>
          <div className="space-y-3">
            {stats.categoryBreakdown.map((c) => (
              <div key={c.category} className="flex items-center gap-1.5 sm:gap-2.5">
                <span className="w-24 shrink-0 truncate text-xs text-zinc-700">{c.category}</span>
                <div className="h-3.5 flex-1 rounded-full bg-zinc-100">
                  <div
                    className="h-3.5 rounded-full bg-gradient-to-r from-[#7c3aed] via-[#9333ea] via-85% to-[#ff6ec7] transition-[width] duration-700"
                    style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="w-9 sm:w-12 shrink-0 text-right text-sm text-zinc-500">{c.count}件</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 月別ヒートマップ（投稿数）。全期間は年をまたいだ月別＝季節性、単年は当年の月別 */}
      {activityHeatmapData.some((d) => d.count > 0) && (
        <div id="activity-heatmap" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
            <TwemojiIcon codepoint="1f4da" alt="📚" className="h-4 w-4" />
            {year === "all" ? "全期間の月別投稿数（季節性）" : `${year}年の月別投稿数`}
          </p>
          <ActivityHeatmap data={activityHeatmapData} />
        </div>
      )}

      {/* 年別投稿数の推移（折れ線）。全期間のみ表示。月別ヒートマップ（季節性）とは軸が異なるため重複しない。
          単年は月別ヒートマップが同じ役割を果たすため折れ線は出さない */}
      {year === "all" && stats.yearlyPostCount.length > 0 && (
        <div id="post-trend" className="scroll-mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
            <TwemojiIcon codepoint="1f4d6" alt="📖" className="h-4 w-4" /> 全期間の年別投稿数の推移
          </p>
          <PostCountLineChart
            data={stats.yearlyPostCount.map((y) => ({ key: y.year, label: `${y.year}年`, count: y.count }))}
            max={maxYearlyPostCount}
            gradientId="yearlyLineGradient"
            labelFormatter={(d) => d.label}
            rotateLabelsOnMobile
            unit="件"
          />
        </div>
      )}
    </div>
  );
}
