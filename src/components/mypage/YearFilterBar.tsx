"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tab: string;
  years: number[];
  value: number | "all";
};

/** マイページの各タブ（自分の投稿・旅行プラン等）共通の年度切り替えセレクト。
 *  選択すると `/mypage?tab=<tab>&year=<year>` へ置き換える（全期間時は year を外す）。 */
export function YearFilterBar({ tab, years, value }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const url = v === "all" ? `/mypage?tab=${tab}` : `/mypage?tab=${tab}&year=${v}`;
    startTransition(() => {
      router.replace(url, { scroll: false });
    });
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <label className="hidden sm:inline text-sm font-semibold text-zinc-500">表示する年：</label>
      <select
        value={value}
        onChange={handleChange}
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
