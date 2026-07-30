import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findWishlistedPostsService } from "@/lib/services/post.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

// マイページ「行きたい」タブの継続取得API（GATE-22種類A）。行きたいリストは非公開のため
// 認証必須・本人のみ（クライアントからuserIdを受け取らず、常にセッションのuserIdを使う）
async function handleGET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const result = await findWishlistedPostsService({ userId: session.user.id, cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
