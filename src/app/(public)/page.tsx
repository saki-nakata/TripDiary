import { auth } from "@/lib/auth";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import {
  findPopularPosts,
  findLatestPosts,
  findLocationCounts,
  findCategoryCounts,
  findTopRatedByCategory,
} from "@/lib/repositories/post.repository";
import type { Post } from "@/types/post";

export default async function PortalPage() {
  const session = await auth();
  const popular = (await findPopularPosts(6)) as Post[];
  const latest = (await findLatestPosts(6)) as Post[];
  const locations = await findLocationCounts();
  const categories = await findCategoryCounts();
  const topRated = (await findTopRatedByCategory(popular.map((p) => p.id))) as Post[];

  return (
    <ExploreFeed
      initialData={{ popular, latest, locations, categories, topRated }}
      viewerId={session?.user?.id}
    />
  );
}
