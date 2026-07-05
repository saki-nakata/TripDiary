import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findFollowingPosts } from "@/lib/repositories/post.repository";
import { createPostService } from "@/lib/services/post.service";
import { postSchema } from "@/lib/validations/post";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const result = await findFollowingPosts({ userId: session.user.id, cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const post = await createPostService(session.user.id, parsed.data);
    return NextResponse.json(post, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
