import { Suspense } from "react";
import { ExploreFilters } from "@/components/explore/ExploreFilters";
import { PostFeed } from "@/components/explore/PostFeed";

export default function ExplorePage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">旅スポットを探す</h1>
        <p className="text-sm text-zinc-500 mt-1">みんなの旅の記録をチェックしよう</p>
      </div>

      <Suspense fallback={null}>
        <ExploreFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-zinc-100 animate-pulse" />
            ))}
          </div>
        }
      >
        <PostFeed />
      </Suspense>
    </div>
  );
}
