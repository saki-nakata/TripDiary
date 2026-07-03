"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardFeed } from "./DashboardFeed";

type Tab = "timeline" | "posts";

export function DashboardTabs() {
  const [tab, setTab] = useState<Tab>("timeline");

  return (
    <div>
      {/* タブ */}
      <div className="flex border-b border-zinc-200 mb-6">
        <button
          onClick={() => setTab("timeline")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === "timeline"
              ? "border-green-600 text-green-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          タイムライン
        </button>
        <button
          onClick={() => setTab("posts")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === "posts"
              ? "border-green-600 text-green-700"
              : "border-transparent text-zinc-500 hover:text-zinc-700"
          }`}
        >
          投稿
        </button>
      </div>

      {/* タイムラインタブ */}
      {tab === "timeline" && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm mb-6">フォロー中のユーザーがいません</p>
          <Link
            href="/search"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            ユーザーを探す
          </Link>
        </div>
      )}

      {/* 投稿タブ */}
      {tab === "posts" && <DashboardFeed />}
    </div>
  );
}
