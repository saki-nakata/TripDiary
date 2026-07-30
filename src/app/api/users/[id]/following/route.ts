import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findFollowingService } from "@/lib/services/follow.service";
import { handleApiError } from "@/lib/api-error";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

// 公開プロフィールの「フォロー中」タブの継続取得API（GATE-22種類B）。認証不要（公開情報）。
// ログイン中の閲覧者がいれば各ユーザーのfollowedByCurrentUserを付与する
async function handleGET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const result = await findFollowingService({ userId: id, viewerId: session?.user?.id, cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
