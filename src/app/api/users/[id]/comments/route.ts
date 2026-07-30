import { NextRequest, NextResponse } from "next/server";
import { findCommentsByAuthorService } from "@/lib/services/user.service";
import { handleApiError } from "@/lib/api-error";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

// 公開プロフィールの「投稿したコメント」タブの継続取得API（GATE-22種類B）。認証不要（公開情報）
async function handleGET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const result = await findCommentsByAuthorService({ authorId: id, cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
