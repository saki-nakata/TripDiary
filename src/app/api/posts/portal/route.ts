import { NextResponse } from "next/server";
import {
  findPopularPosts,
  findLatestPosts,
  findLocationCounts,
  findCategoryCounts,
  findTopRatedByCategory,
} from "@/lib/repositories/post.repository";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const popular = await findPopularPosts(6);
    const latest = await findLatestPosts(6);
    const locations = await findLocationCounts();
    const categories = await findCategoryCounts();
    const topRated = await findTopRatedByCategory(popular.map((p) => p.id));

    return NextResponse.json({ popular, latest, locations, categories, topRated });
  } catch (e) {
    return handleApiError(e);
  }
}
