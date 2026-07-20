"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PrefectureMapView } from "@/components/map/PrefectureMapView";
import { RemovableSavedCard } from "@/components/posts/RemovableSavedCard";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { LOCATIONS } from "@/lib/constants";
import type { Post } from "@/types/post";

type Kind = "wishlist" | "visited";

const SAVED_GRID = "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4";

/** 地図の色の濃さ（＝保存件数＝旅の熱量）の凡例 */
function HeatLegend() {
  return (
    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
      <span>少ない</span>
      <span
        className="h-2.5 w-24 rounded-full"
        style={{ background: "linear-gradient(to right, #caf8b7, #3ea32c)" }}
        aria-hidden
      />
      <span>多い</span>
    </div>
  );
}

/**
 * 行きたい/訪問済みの統合ビュー。上部に都道府県マップ、下に県別グループのカード一覧を表示する。
 * 地図で保存済みの県をクリックすると、その県のグループへスクロールして一時的にハイライトする。
 */
export function SavedMapSection({ posts, kind }: { posts: Post[]; kind: Kind }) {
  // 「外す」ボタンで楽観的に消したカードのID。カード自体の非表示だけでなく、
  // 地図の濃淡・件数見出しにも同じタイミングで反映させるためここで一元管理する
  // （カードだけ先に消えて周辺の集計値が古いままになる不整合を防ぐ）
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const handleRemove = useCallback((postId: string) => {
    setRemovedIds((prev) => new Set(prev).add(postId));
  }, []);
  const handleRestore = useCallback((postId: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
  }, []);
  const visiblePosts = useMemo(() => posts.filter((p) => !removedIds.has(p.id)), [posts, removedIds]);

  // エリアごとの保存件数（＝旅の熱量）。地図の濃淡と件数バッジに使う
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of visiblePosts) counts[p.location] = (counts[p.location] ?? 0) + 1;
    return counts;
  }, [visiblePosts]);

  const savedLocations = useMemo(() => Object.keys(locationCounts), [locationCounts]);
  const order = LOCATIONS as readonly string[];
  const sortedLocations = useMemo(
    () => savedLocations.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    [savedLocations, order]
  );

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const mapRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  // 地図クリックで下の一覧へスクロールした後、地図へ簡単に戻れるようフローティング
  // ボタンを表示するための「地図が画面外に出たか」の状態
  const [showBackToMap, setShowBackToMap] = useState(false);

  useEffect(() => {
    const mapEl = mapRef.current;
    if (!mapEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowBackToMap(!entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px" }
    );
    observer.observe(mapEl);
    return () => observer.disconnect();
  }, []);

  const handlePrefectureClick = useCallback((name: string) => {
    const el = sectionRefs.current[name];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlighted(name);
    window.setTimeout(() => {
      setHighlighted((cur) => (cur === name ? null : cur));
    }, 1600);
  }, []);

  const scrollToMap = useCallback(() => {
    mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="space-y-8">
      <div ref={mapRef} className="scroll-mt-20 md:scroll-mt-4 space-y-2">
        <PrefectureMapView
          visitedLocations={savedLocations}
          onPrefectureClick={handlePrefectureClick}
          intensityByLocation={locationCounts}
          className="mx-auto h-auto w-full max-w-xs"
        />
        <HeatLegend />
      </div>
      <div className="space-y-6">
        {sortedLocations.map((location) => {
          const group = visiblePosts.filter((p) => p.location === location);
          const isHighlighted = highlighted === location;
          return (
            <section
              key={location}
              ref={(el) => {
                sectionRefs.current[location] = el;
              }}
              className={`scroll-mt-6 space-y-3 rounded-xl p-3 -mx-3 transition-colors duration-500 ${
                isHighlighted ? "bg-green-50" : ""
              }`}
            >
              <h3 className="flex items-center gap-1.5 text-base font-bold text-zinc-800">
                <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-5 w-5" />
                {location}
                <span className="text-sm font-semibold text-zinc-400">（{group.length}件）</span>
              </h3>
              <div className={SAVED_GRID}>
                {group.map((p) => (
                  <RemovableSavedCard key={p.id} post={p} kind={kind} onRemove={handleRemove} onRestore={handleRestore} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {showBackToMap && (
        <button
          type="button"
          onClick={scrollToMap}
          className="animate-fade-in fixed bottom-24 right-4 z-40 flex items-center gap-1.5 rounded-full border border-green-100 bg-white/80 px-4 py-2.5 text-sm font-semibold text-green-700 shadow-[0_8px_24px_-4px_rgba(22,163,74,0.35)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_12px_28px_-4px_rgba(22,163,74,0.45)] md:bottom-6"
        >
          <TwemojiIcon codepoint="1f5fa" alt="🗺️" className="h-4 w-4" />
          地図に戻る
        </button>
      )}
    </div>
  );
}
