import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { findPlanByIdService } from "@/lib/services/plan.service";
import { findWishlistedPostsService } from "@/lib/services/post.service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { PlanForm } from "@/components/plans/PlanForm";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";
import type { PlanDetail, PlanSpotPost } from "@/types/plan";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPlanPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let plan;
  try {
    plan = await findPlanByIdService(session.user.id, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    if (e instanceof ForbiddenError) redirect("/mypage");
    throw e;
  }

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
        <TwemojiIcon codepoint="270f" className="h-6 w-6" /> 旅行プランを編集する
      </h1>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-4 md:p-8">
        <PlanForm initialData={plan as unknown as PlanDetail} wishlistPosts={wishlistPosts} />
      </div>
    </div>
  );
}
