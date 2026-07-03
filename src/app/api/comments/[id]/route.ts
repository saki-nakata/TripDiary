import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findCommentById, deleteComment } from "@/lib/repositories/comment.repository";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const comment = await findCommentById(id);
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAuthor = comment.authorId === session.user.id;
    const isPostAuthor = comment.post.authorId === session.user.id;
    if (!isAuthor && !isPostAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteComment(id);
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
