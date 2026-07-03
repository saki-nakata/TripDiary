import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findExplorePosts } from "@/lib/repositories/post.repository";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = req.nextUrl;

    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const sort = (searchParams.get("sort") ?? "latest") as "latest" | "popular";
    const category = searchParams.get("category") ?? undefined;
    const prefecture = searchParams.get("prefecture") ?? undefined;

    const result = await findExplorePosts({
      cursor,
      limit,
      sort,
      category,
      prefecture,
      userId: session?.user?.id,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
