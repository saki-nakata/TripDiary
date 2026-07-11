"use client";

import { useState } from "react";
import type { StatsResponse } from "@/types/stats";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

type Props = {
  years: number[];
  initialYear: number | "all";
  initialStats: StatsResponse;
};

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);

// Spotify Wrapped風にカードごとに異なるグラデーションを使う（プロトタイプ準拠）
const CARD_GRADIENTS = [
  "from-[#f093fb] to-[#f5576c]",
  "from-[#4facfe] to-[#00f2fe]",
  "from-[#43e97b] to-[#38f9d7]",
  "from-[#fa709a] to-[#fee140]",
  "from-[#a18cd1] to-[#fbc2eb]",
  "from-[#fda085] to-[#f6d365]",
  "from-[#30cfd0] to-[#330867]",
];

function StatCard({
  codepoint,
  label,
  value,
  delay,
  gradient,
}: {
  codepoint: string;
  label: string;
  value: string;
  delay: number;
  gradient: string;
}) {
  return (
    <div
      className={`animate-fade-in flex flex-col items-center rounded-2xl bg-gradient-to-br ${gradient} p-5 text-center text-white shadow-sm`}
      style={{ animationDelay: `${delay}s` }}
    >
      <TwemojiIcon codepoint={codepoint} className="h-7 w-7" />
      <p className="mt-2 text-3xl font-extrabold [text-shadow:0_2px_8px_rgba(0,0,0,.2)]">{value}</p>
      <p className="text-xs font-medium text-white/80">{label}</p>
    </div>
  );
}

function PostCountLineChart({
  data,
  max,
  gradientId,
  labelFormatter,
}: {
  data: { key: string | number; label: string; count: number }[];
  max: number;
  gradientId: string;
  labelFormatter: (d: { key: string | number; label: string; count: number }) => string;
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
      <div className="flex items-stretch gap-2">
        <div className="relative h-32 w-full flex-1">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
            {yTicks.map((t) => {
              const y = height - padding - ((height - padding * 2) * t) / max;
              return <line key={t} x1={padding} y1={y} x2={width} y2={y} stroke="#f4f4f5" strokeWidth="0.5" />;
            })}
            <line x1={width} y1={padding} x2={width} y2={height - padding} stroke="#e4e4e7" strokeWidth="0.5" />
            <path d={path} fill="none" stroke={`url(#${gradientId})`} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffafd7" />
                <stop offset="70%" stopColor="#ff2d78" />
                <stop offset="100%" stopColor="#c026d3" />
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
                backgroundColor: "#ffcba4",
                border: "2px solid #fff200",
              }}
            />
          ))}
        </div>
        <div className="flex h-32 w-9 shrink-0 flex-col justify-between py-[6px] text-right text-sm text-zinc-500">
          {yTicks.map((t) => (
            <span key={t}>{t}件</span>
          ))}
        </div>
      </div>
      <div className="flex items-stretch gap-2">
        <div className="relative h-5 flex-1">
          {points.map((p) => (
            <span
              key={p.d.key}
              className="absolute -translate-x-1/2 whitespace-nowrap text-sm text-zinc-500"
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

export function ReportSummary({ years, initialYear, initialStats }: Props) {
  const [year, setYear] = useState(initialYear);
  const [stats, setStats] = useState<StatsResponse>(initialStats);
  const [loading, setLoading] = useState(false);

  async function handleYearChange(newYear: number | "all") {
    setYear(newYear);
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?year=${newYear}`);
      if (res.ok) {
        setStats(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  const yearLabel = year === "all" ? "全期間" : `${year}年`;

  if (stats.totalPosts === 0) {
    return (
      <div className="-mt-3 space-y-4">
        <YearSelect years={years} value={year} onChange={handleYearChange} />
        <p className="py-16 text-center text-sm text-zinc-400">{yearLabel}の旅の記録がありません。</p>
      </div>
    );
  }

  const maxCategoryCount = Math.max(1, ...stats.categoryBreakdown.map((c) => c.count));
  const maxMonthlyPostCount = Math.max(1, ...stats.monthlyPostCount.map((m) => m.count));
  const maxYearlyPostCount = Math.max(1, ...stats.yearlyPostCount.map((y) => y.count));

  return (
    <div className={`-mt-3 space-y-6 transition-opacity ${loading ? "opacity-50" : ""}`}>
      <YearSelect years={years} value={year} onChange={handleYearChange} />

      <p className="flex items-center gap-1.5 text-lg font-bold text-zinc-800">
        <TwemojiIcon codepoint="1f3c6" alt="🏆" className="h-5 w-5" /> {yearLabel}の旅まとめ
      </p>

      {/* 7枚のまとめカード */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard codepoint="1f4da" label="投稿数" value={`${stats.totalPosts}件`} delay={0} gradient={CARD_GRADIENTS[0]} />
        <StatCard codepoint="1f4f8" label="写真枚数" value={`${stats.totalPhotos}枚`} delay={0.1} gradient={CARD_GRADIENTS[1]} />
        <StatCard codepoint="1f4cd" label="訪問エリア数" value={`${stats.visitedLocations.length}エリア`} delay={0.2} gradient={CARD_GRADIENTS[2]} />
        <StatCard codepoint="1f5fa" label="訪問スポット数" value={`${stats.totalPosts}件`} delay={0.3} gradient={CARD_GRADIENTS[3]} />
        <StatCard codepoint="1f4d6" label="旅行回数" value={`${stats.completedPlans}回`} delay={0.4} gradient={CARD_GRADIENTS[4]} />
        <StatCard codepoint="1f4b4" label="旅行費用合計" value={stats.totalCost > 0 ? `¥${stats.totalCost.toLocaleString()}` : "—"} delay={0.5} gradient={CARD_GRADIENTS[5]} />
        <StatCard codepoint="1f6a9" label="最多訪問エリア" value={stats.topLocation ?? "—"} delay={0.6} gradient={CARD_GRADIENTS[6]} />
      </div>

      {/* カテゴリ別バーグラフ */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
            <TwemojiIcon codepoint="1f3f7" alt="🏷️" className="h-4 w-4" /> カテゴリ別投稿数
          </p>
          <div className="space-y-3">
            {stats.categoryBreakdown.map((c) => (
              <div key={c.category} className="flex items-center gap-2.5">
                <span className="w-24 shrink-0 text-sm text-zinc-700">{c.category}</span>
                <div className="h-3.5 flex-1 rounded-full bg-zinc-100">
                  <div
                    className="h-3.5 rounded-full bg-gradient-to-r from-[#ffe066] to-[#ffc233] transition-[width] duration-700"
                    style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-sm text-zinc-500">{c.count}件</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 月別 / 年別投稿数の推移 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
          <TwemojiIcon codepoint="1f4da" alt="📚" className="h-4 w-4" /> {year === "all" ? "年別投稿数の推移" : "月別投稿数の推移"}
        </p>
        {year === "all" ? (
          <PostCountLineChart
            data={stats.yearlyPostCount.map((y) => ({ key: y.year, label: `${y.year}年（${y.count}件）`, count: y.count }))}
            max={maxYearlyPostCount}
            gradientId="yearlyLineGradient"
            labelFormatter={(d) => d.label}
          />
        ) : (
          <PostCountLineChart
            data={stats.monthlyPostCount.map((m) => ({ key: m.month, label: MONTH_LABELS[m.month - 1], count: m.count }))}
            max={maxMonthlyPostCount}
            gradientId="monthlyLineGradient"
            labelFormatter={(d) => d.label}
          />
        )}
      </div>

      {/* 訪問エリアバッジ */}
      {stats.visitedLocations.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="mb-3 flex items-center gap-1.5 text-lg font-bold text-zinc-800">
            <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-4 w-4" /> 訪問エリア
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.visitedLocations.map((loc) => (
              <span key={loc} className="rounded-full bg-violet-100 px-3.5 py-1.5 text-sm font-semibold text-violet-800">
                {loc}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function YearSelect({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number | "all";
  onChange: (year: number | "all") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="text-sm font-semibold text-zinc-500">表示する年：</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value === "all" ? "all" : Number(e.target.value))}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="all">全期間</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}年
          </option>
        ))}
      </select>
    </div>
  );
}
