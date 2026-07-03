import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findPostById } from "@/lib/repositories/post.repository";
import { updatePostService, deletePostService } from "@/lib/services/post.service";
import { postSchema } from "@/lib/validations/post";
import { handleApiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    const post = await findPostById(id, session?.user?.id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const updated = await updatePostService(session.user.id, id, parsed.data);
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deletePostService(session.user.id, id);
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    return handleApiError(e);
  }
}
