"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CATEGORIES, PREFECTURES } from "@/lib/constants";

export function ExploreFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") ?? "latest";
  const category = searchParams.get("category") ?? "";
  const prefecture = searchParams.get("prefecture") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("cursor");
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* ソート */}
      <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-sm">
        <button
          onClick={() => update("sort", "latest")}
          className={`px-3 py-1.5 font-medium transition-colors ${
            sort === "latest"
              ? "bg-green-600 text-white"
              : "bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          新着順
        </button>
        <button
          onClick={() => update("sort", "popular")}
          className={`px-3 py-1.5 font-medium transition-colors ${
            sort === "popular"
              ? "bg-green-600 text-white"
              : "bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          人気順
        </button>
      </div>

      {/* カテゴリ */}
      <select
        value={category}
        onChange={(e) => update("category", e.target.value)}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">すべてのカテゴリ</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* エリア */}
      <select
        value={prefecture}
        onChange={(e) => update("prefecture", e.target.value)}
        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">すべてのエリア</option>
        {PREFECTURES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* リセット */}
      {(category || prefecture || sort !== "latest") && (
        <button
          onClick={() => router.push("/")}
          className="text-sm text-zinc-400 hover:text-zinc-600 underline"
        >
          リセット
        </button>
      )}
    </div>
  );
}
