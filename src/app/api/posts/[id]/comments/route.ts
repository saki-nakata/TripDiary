import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findCommentsByPostId } from "@/lib/repositories/comment.repository";
import { createCommentService } from "@/lib/services/comment.service";
import { handleApiError } from "@/lib/api-error";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const result = await findCommentsByPostId({ postId: id, cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

const commentSchema = z.object({
  body: z.string().min(1, "コメントを入力してください").max(2000, "コメントは2000文字以内で入力してください"),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const comment = await createCommentService(session.user.id, id, parsed.data.body);
    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
