import Link from "next/link";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import { CardImage } from "@/components/posts/CardImage";

type AreaItem = { location: string; count: number; thumbnailUrl: string | null };

export function AreaSection({ areas }: { areas: AreaItem[] }) {
  if (areas.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-800">
          <TwemojiIcon codepoint="1f4cd" className="h-5 w-5" /> エリアから探す
        </h2>
        <Link href="/search?tab=area" className="text-sm text-[#16a34a] font-medium hover:underline">
          エリア検索
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
        {areas.map((area) => (
          <Link
            key={area.location}
            href={`/search?tab=area&location=${encodeURIComponent(area.location)}`}
            className="rounded-xl overflow-hidden bg-white border border-zinc-200 transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
          >
            <div className="relative h-20 bg-zinc-100 overflow-hidden">
              {area.thumbnailUrl && (
                <CardImage
                  src={area.thumbnailUrl}
                  alt={area.location}
                  sizes="140px"
                  containerRatio={140 / 80}
                />
              )}
            </div>
            <div className="flex items-center justify-between px-2.5 py-2">
              <p className="font-semibold text-sm text-zinc-800">{area.location}</p>
              <p className="text-xs text-zinc-400">{area.count}件</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
