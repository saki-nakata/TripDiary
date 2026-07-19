import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { findWishlistedPostsService } from "@/lib/services/post.service";
import { PlanForm } from "@/components/plans/PlanForm";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import type { PlanSpotPost } from "@/types/plan";

export default async function NewPlanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { posts } = await findWishlistedPostsService({ userId: session.user.id, limit: 50 });
  const wishlistPosts: PlanSpotPost[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    location: p.location,
    category: p.category,
    rating: p.rating,
    lat: p.lat,
    lng: p.lng,
    images: p.images.map((img: { url: string }) => ({ url: img.url })),
  }));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 -mt-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900">
        <TwemojiIcon codepoint="1f9ed" className="h-6 w-6" /> 旅行プランを作成する
      </h1>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-4 md:p-8">
        <PlanForm wishlistPosts={wishlistPosts} />
      </div>
    </div>
  );
}
