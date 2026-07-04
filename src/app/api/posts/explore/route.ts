import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findExplorePosts } from "@/lib/repositories/post.repository";
import { handleApiError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = req.nextUrl;

    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const sort = (searchParams.get("sort") ?? "latest") as "latest" | "popular";
    const category = searchParams.get("category") ?? undefined;
    const location = searchParams.get("location") ?? undefined;

    const result = await findExplorePosts({
      cursor,
      limit,
      sort,
      category,
      location,
      userId: session?.user?.id,
    });

    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
