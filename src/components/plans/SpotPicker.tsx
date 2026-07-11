"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CATEGORIES, CATEGORY_ICONS, LOCATIONS } from "@/lib/constants";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { PlanSpotPost, PlanSpotInput } from "@/types/plan";

const WISHLIST_PREVIEW_COUNT = 3;
const WISHLIST_LOAD_MORE_COUNT = 10;

export type SelectedSpot =
  | (PlanSpotPost & { kind: "post" })
  | { kind: "free"; id: string; title: string; location: string | null; category: string | null };

type Props = {
  initialSelected: SelectedSpot[];
  wishlistPosts: PlanSpotPost[];
  onChange: (spots: PlanSpotInput[]) => void;
};

function SpotListItem({ post, onAdd }: { post: PlanSpotPost; onAdd: (post: PlanSpotPost) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAdd(post)}
        className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-2 text-left hover:bg-zinc-50"
      >
        {post.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.images[0].url} alt="" className="h-10 w-10 rounded object-cover" />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-lg">
            <CategoryIcon category={post.category ?? "その他"} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-800">{post.title}</p>
          <p className="flex items-center gap-1 truncate text-xs text-zinc-400">
            <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-2.5 w-2.5" /> {post.location}
            {post.category ? (
              <>
                {" / "}<CategoryIcon category={post.category} /> {post.category}
              </>
            ) : ""}
          </p>
        </div>
        <span
          aria-label="追加"
          className="mr-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-green-600 text-xs font-bold leading-none text-green-600"
        >
          ＋
        </span>
      </button>
    </li>
  );
}

function SortableSelectedItem({
  spot,
  index,
  draggable,
  onRemove,
}: {
  spot: SelectedSpot;
  index: number;
  draggable: boolean;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: spot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { title, location, category } = spot;
  const image = spot.kind === "post" ? spot.images[0] : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-2 ${isDragging ? "opacity-50 shadow-md" : ""}`}
    >
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="ドラッグして並び替え"
          title="ドラッグして並び替え"
          className="shrink-0 cursor-grab touch-none rounded p-1 text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>
      )}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
        {index + 1}
      </span>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" className="h-10 w-10 rounded object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-zinc-100 text-lg">
          <CategoryIcon category={category ?? "その他"} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-800">{title}</p>
        <p className="flex items-center gap-1 truncate text-xs text-zinc-400">
          {location && (
            <>
              <TwemojiIcon codepoint="1f4cd" alt="📍" className="h-2.5 w-2.5" /> {location}
            </>
          )}
          {category ? (
            <>
              {" / "}<CategoryIcon category={category} /> {category}
            </>
          ) : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(spot.id)}
        aria-label="削除"
        className="shrink-0 rounded px-1.5 py-0.5 text-red-400 hover:text-red-600"
      >
        <TwemojiIcon codepoint="274c" alt="削除" className="h-3 w-3" />
      </button>
    </li>
  );
}

export function SpotPicker({ initialSelected, wishlistPosts, onChange }: Props) {
  const [selected, setSelected] = useState<SelectedSpot[]>(initialSelected);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlanSpotPost[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [freeTitle, setFreeTitle] = useState("");
  const [freeLocation, setFreeLocation] = useState("");
  const [freeCategory, setFreeCategory] = useState("");
  const [wishlistVisibleCount, setWishlistVisibleCount] = useState(WISHLIST_PREVIEW_COUNT);
  const [freeErrors, setFreeErrors] = useState<{ title?: string; location?: string }>({});

  const [showOthers, setShowOthers] = useState(false);
  const [othersLoaded, setOthersLoaded] = useState(false);
  const [othersList, setOthersList] = useState<PlanSpotPost[]>([]);
  const [othersLoading, setOthersLoading] = useState(false);
  const [othersCursor, setOthersCursor] = useState<string | null>(null);
  const [othersHasMore, setOthersHasMore] = useState(false);

  const selectedIds = new Set(selected.map((s) => s.id));

  function toPayload(spots: SelectedSpot[]): PlanSpotInput[] {
    return spots.map((s) =>
      s.kind === "post"
        ? { type: "post", postId: s.id }
        : { type: "free", title: s.title, location: s.location ?? "", category: s.category }
    );
  }

  function emit(next: SelectedSpot[]) {
    setSelected(next);
    onChange(toPayload(next));
  }

  function addSpot(post: PlanSpotPost) {
    if (selectedIds.has(post.id)) return;
    emit([...selected, { ...post, kind: "post" }]);
  }

  function addFreeSpot() {
    const title = freeTitle.trim();
    const errors: { title?: string; location?: string } = {};
    if (!title) errors.title = "スポット名を入力してください";
    if (!freeLocation) errors.location = "エリアを選択してください";
    setFreeErrors(errors);
    if (Object.keys(errors).length > 0) return;

    emit([
      ...selected,
      {
        kind: "free",
        id: `free-${crypto.randomUUID()}`,
        title,
        location: freeLocation,
        category: freeCategory || null,
      },
    ]);
    setFreeTitle("");
    setFreeLocation("");
    setFreeCategory("");
    setFreeErrors({});
  }

  function clearFreeSpot() {
    setFreeTitle("");
    setFreeLocation("");
    setFreeCategory("");
    setFreeErrors({});
  }

  function removeSpot(id: string) {
    emit(selected.filter((s) => s.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selected.findIndex((s) => s.id === active.id);
    const newIndex = selected.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    emit(arrayMove(selected, oldIndex, newIndex));
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/posts/explore?q=${encodeURIComponent(value)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.posts ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
  }

  function clearSearch() {
    setQuery("");
    setSearchResults([]);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }

  async function loadOthers(cursor?: string) {
    setOthersLoading(true);
    try {
      const url = cursor
        ? `/api/posts/explore?limit=10&cursor=${encodeURIComponent(cursor)}`
        : `/api/posts/explore?limit=10`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOthersList((prev) => (cursor ? [...prev, ...(data.posts ?? [])] : (data.posts ?? [])));
        setOthersCursor(data.nextCursor ?? null);
        setOthersHasMore(!!data.hasMore);
      }
    } finally {
      setOthersLoading(false);
      setOthersLoaded(true);
    }
  }

  function toggleOthers() {
    const next = !showOthers;
    setShowOthers(next);
    if (next && !othersLoaded) {
      loadOthers();
    }
  }

  const wishlistIds = new Set(wishlistPosts.map((p) => p.id));
  const wishlistCandidates = wishlistPosts.filter((p) => !selectedIds.has(p.id));
  const otherCandidates = othersList.filter((p) => !selectedIds.has(p.id) && !wishlistIds.has(p.id));

  return (
    <div className="space-y-4">
      {/* 選択済みスポット */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-zinc-700">
            選択済みスポット{selected.length > 0 ? `（${selected.length}）` : ""}
          </p>
          {selected.length >= 2 && (
            <p className="text-xs text-zinc-400">ドラッグ&ドロップで並び順を変更できます</p>
          )}
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-zinc-400">まだスポットが選択されていません</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={selected.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {selected.map((spot, i) => (
                  <SortableSelectedItem
                    key={spot.id}
                    spot={spot}
                    index={i}
                    draggable={selected.length > 1}
                    onRemove={removeSpot}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* スポットをキーワード検索（全ユーザーの投稿対象、常時展開） */}
      <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-700">
          <TwemojiIcon codepoint="1f50d" alt="🔍" className="h-4 w-4" /> スポットを検索
        </p>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="スポット名・キーワードで検索"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="検索語をクリア"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 transition-colors"
            >
              <TwemojiIcon codepoint="274c" alt="クリア" className="h-2 w-2" />
            </button>
          )}
        </div>
        {searching && <p className="text-xs text-zinc-400">検索中…</p>}
        {!searching && query && searchResults.length === 0 && (
          <p className="text-xs text-zinc-400">該当するスポットが見つかりません</p>
        )}
        <ul className="space-y-2">
          {searchResults
            .filter((p) => !selectedIds.has(p.id))
            .map((post) => (
              <SpotListItem key={post.id} post={post} onAdd={addSpot} />
            ))}
        </ul>
      </div>

      {/* 行きたいリスト優先候補 */}
      {wishlistCandidates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-700">
              <TwemojiIcon codepoint="1f516" alt="🔖" className="h-4 w-4" /> 行きたいリスト（{wishlistCandidates.length}件）
            </p>
            {wishlistVisibleCount > WISHLIST_PREVIEW_COUNT && (
              <button
                type="button"
                onClick={() => setWishlistVisibleCount(WISHLIST_PREVIEW_COUNT)}
                className="shrink-0 rounded-lg border border-dashed border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                表示を減らす
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {wishlistCandidates.slice(0, wishlistVisibleCount).map((post) => (
              <SpotListItem key={post.id} post={post} onAdd={addSpot} />
            ))}
          </ul>
          {wishlistVisibleCount < wishlistCandidates.length && (
            <button
              type="button"
              onClick={() =>
                setWishlistVisibleCount((c) => Math.min(c + WISHLIST_LOAD_MORE_COUNT, wishlistCandidates.length))
              }
              className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              もっと見る（残り{wishlistCandidates.length - wishlistVisibleCount}件）
            </button>
          )}
        </div>
      )}

      {/* その他のスポット（全ユーザーの投稿を新着順に一覧表示。プロトタイプ準拠） */}
      <div className="rounded-lg border border-zinc-200">
        <button
          type="button"
          onClick={toggleOthers}
          className="flex w-full items-center justify-between p-3 text-sm font-bold text-zinc-700"
        >
          <span className="flex items-center gap-1.5">
            <TwemojiIcon codepoint="1f5fa" alt="🗺️" className="h-4 w-4" /> その他のスポット{othersLoaded ? `（${otherCandidates.length}件）` : ""}
          </span>
          <span>{showOthers ? "▲" : "▼"}</span>
        </button>
        {showOthers && (
          <div className="space-y-2 border-t border-zinc-200 p-3">
            {othersLoading && othersList.length === 0 && <p className="text-xs text-zinc-400">読み込み中…</p>}
            {othersLoaded && otherCandidates.length === 0 && (
              <p className="text-xs text-zinc-400">追加できるスポットがありません</p>
            )}
            <ul className="space-y-2">
              {otherCandidates.map((post) => (
                <SpotListItem key={post.id} post={post} onAdd={addSpot} />
              ))}
            </ul>
            {othersHasMore && (
              <button
                type="button"
                onClick={() => loadOthers(othersCursor ?? undefined)}
                disabled={othersLoading}
                className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                {othersLoading ? "読み込み中…" : "もっと見る"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 新規追加（投稿が存在しないスポット向け） */}
      <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pr-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="mr-2 flex items-center gap-1.5 text-sm font-bold text-zinc-700">
              <TwemojiIcon codepoint="270f" alt="✏️" className="h-4 w-4" /> 新規スポット追加
            </p>
            <p className="text-xs text-zinc-500">まだ投稿がないスポットも、プランに追加できます</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={clearFreeSpot}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-50 transition-colors"
            >
              クリア
            </button>
            <button
              type="button"
              onClick={addFreeSpot}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
            >
              追加
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-start justify-between">
            <label className="text-sm font-semibold text-zinc-700">
              スポット名 <span className="text-red-500">*</span>
            </label>
            <span className={`mt-1 mr-4 text-xs ${freeTitle.length > 60 ? "text-red-500" : "text-zinc-400"}`}>
              {freeTitle.length} / 60 文字
            </span>
          </div>
          <input
            type="text"
            value={freeTitle}
            onChange={(e) => {
              setFreeTitle(e.target.value);
              if (e.target.value.trim()) setFreeErrors((prev) => ({ ...prev, title: undefined }));
            }}
            placeholder="例：〇〇公園"
            maxLength={60}
            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${freeErrors.title ? "border-red-400" : "border-zinc-200"}`}
          />
          {freeErrors.title && <p className="text-xs text-red-500">{freeErrors.title}</p>}
        </div>
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs font-semibold text-zinc-700">
                エリア <span className="text-red-500">*</span>
              </label>
              <select
                value={freeLocation}
                onChange={(e) => {
                  setFreeLocation(e.target.value);
                  if (e.target.value) setFreeErrors((prev) => ({ ...prev, location: undefined }));
                }}
                className={`w-full rounded-lg border bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${freeLocation ? "text-zinc-800" : "text-zinc-400"} ${freeErrors.location ? "border-red-400" : "border-zinc-200"}`}
              >
                <option value=""></option>
                {LOCATIONS.map((l) => (
                  <option key={l} value={l} className="text-zinc-800">{l}</option>
                ))}
              </select>
            </div>
            {freeErrors.location && <p className="text-xs text-red-500">{freeErrors.location}</p>}
          </div>
          <div className="flex flex-1 items-center gap-2">
            <label className="shrink-0 text-xs font-semibold text-zinc-700">カテゴリ</label>
            <select
              value={freeCategory}
              onChange={(e) => setFreeCategory(e.target.value)}
              className={`w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${freeCategory ? "text-zinc-800" : "text-zinc-400"}`}
            >
              <option value="" className="text-zinc-400">未選択でもOK</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="text-zinc-800">{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
