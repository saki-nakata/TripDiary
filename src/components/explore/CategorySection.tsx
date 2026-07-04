import { CATEGORY_ICONS } from "@/lib/constants";

type CategoryItem = { category: string; count: number };

export function CategorySection({ categories }: { categories: CategoryItem[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-base font-bold text-zinc-800">🗂️ カテゴリから探す</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
        {categories.map((c) => (
          <div
            key={c.category}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 py-6"
          >
            <span className="text-3xl">{CATEGORY_ICONS[c.category] ?? "📍"}</span>
            <span className="text-xs font-medium text-zinc-700">{c.category}</span>
            <span className="text-[11px] text-zinc-400">{c.count}件</span>
          </div>
        ))}
      </div>
    </section>
  );
}
