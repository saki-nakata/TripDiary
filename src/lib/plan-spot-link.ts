import type { PlanSpotEntry } from "@/types/plan";

export function buildSpotRecordHref(
  planId: string,
  spot: PlanSpotEntry,
  viewerUserId: string
): string {
  const title = spot.post?.title ?? spot.freeTitle ?? "";
  const location = spot.post?.location ?? spot.freeLocation ?? "";
  const category = spot.post?.category ?? spot.freeCategory ?? null;
  const presetImageUrl =
    spot.post?.authorId === viewerUserId ? spot.post?.images[0]?.url : undefined;

  return (
    `/posts/new?planId=${planId}&presetTitle=${encodeURIComponent(title)}` +
    `&presetLocation=${encodeURIComponent(location)}` +
    `&presetCategory=${encodeURIComponent(category ?? "")}` +
    (presetImageUrl ? `&presetImageUrl=${encodeURIComponent(presetImageUrl)}` : "")
  );
}
