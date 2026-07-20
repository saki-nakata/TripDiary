import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findExplorePostsService } from "@/lib/services/post.service";
import { handleApiError } from "@/lib/api-error";
import { withRequestLogging } from "@/lib/request-logging";

async function handleGET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = req.nextUrl;

    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const sort = (searchParams.get("sort") ?? "latest") as "latest" | "popular";
    const category = searchParams.get("category") ?? undefined;
    const location = searchParams.get("location") ?? undefined;
    const q = searchParams.get("q") ?? undefined;

    const result = await findExplorePostsService({
      cursor,
      limit,
      sort,
      category,
      location,
      q,
      userId: session?.user?.id,
    });

    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
