"use client";

import { useState } from "react";
import Link from "next/link";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { TimelineYearGroup } from "@/types/stats";

function formatDateSlash(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${y}/${m}/${d}`;
}

function YearSection({ group }: { group: TimelineYearGroup }) {
  const [expanded, setExpanded] = useState(false);
  const visiblePosts = expanded ? group.posts : group.posts.slice(0, 3);
  const remaining = group.posts.length - 3;

  return (
    <div className="space-y-1.5">
      <p className="text-base font-bold text-zinc-800">{group.year}年</p>
      <ul className="space-y-2">
        {visiblePosts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/posts/${post.id}`}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 hover:bg-zinc-50 transition-colors"
            >
              {post.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.images[0].url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-lg">
                  <CategoryIcon category={post.category ?? "その他"} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-zinc-800">{post.title}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-zinc-400">
                  <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-3 w-3" />{" "}
                  {post.location}
                  {post.category && (
                    <>
                      {" / "}
                      <CategoryIcon category={post.category} /> {post.category}
                    </>
                  )}
                </p>
              </div>
              <span className="shrink-0 text-xs text-zinc-500">
                {formatDateSlash(post.visitedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="block w-full rounded-lg border border-dashed border-zinc-300 p-2 text-center text-sm font-semibold text-green-600 transition-colors hover:bg-zinc-50"
        >
          {expanded ? "▲ 折りたたむ" : `▼ 残り${remaining}件を表示`}
        </button>
      )}
    </div>
  );
}

export function ReportTimeline({ groups }: { groups: TimelineYearGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-lg font-bold text-zinc-800">
        <TwemojiIcon codepoint="1f4da" alt="📚" className="h-5 w-5" /> 年別旅行記録
      </p>
      {groups.map((group) => (
        <YearSection key={group.year} group={group} />
      ))}
    </div>
  );
}
