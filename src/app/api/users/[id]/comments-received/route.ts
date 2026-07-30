import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findCommentsReceivedByAuthorService } from "@/lib/services/user.service";
import { handleApiError } from "@/lib/api-error";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

// マイページ「自分へのコメント」タブの継続取得API（GATE-22種類B）。本人限定
// （自分の投稿に届いたコメントであり、UI上もselfOnlyタブとして扱っているため）
async function handleGET(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }
    const { id } = await params;
    if (session.user.id !== id) {
      throw new ForbiddenError();
    }

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const result = await findCommentsReceivedByAuthorService({ authorId: id, cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
