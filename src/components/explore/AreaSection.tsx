import Image from "next/image";
import Link from "next/link";

type AreaItem = { location: string; count: number; thumbnailUrl: string | null };

export function AreaSection({ areas }: { areas: AreaItem[] }) {
  if (areas.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-800">📍 エリアから探す</h2>
        <Link href="/search?tab=area" className="text-sm text-[#16a34a] font-medium hover:underline">
          エリア検索
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {areas.map((area) => (
          <div
            key={area.location}
            className="rounded-xl overflow-hidden bg-white border border-zinc-200"
          >
            <div className="relative h-20 bg-zinc-100">
              {area.thumbnailUrl && (
                <Image
                  src={area.thumbnailUrl}
                  alt={area.location}
                  fill
                  sizes="140px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex items-center justify-between px-2.5 py-2">
              <p className="font-semibold text-sm text-zinc-800">{area.location}</p>
              <p className="text-xs text-zinc-400">{area.count}件</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
