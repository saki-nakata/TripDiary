import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCommentService } from "@/lib/services/comment.service";
import { handleApiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteCommentService(session.user.id, id);
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    return handleApiError(e);
  }
}
