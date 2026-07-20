import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCommentService } from "@/lib/services/comment.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

async function handleDELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    await deleteCommentService(session.user.id, id);
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    return handleApiError(e);
  }
}

export const DELETE = withRequestLogging(handleDELETE);
