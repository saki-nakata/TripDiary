import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findCompletedPlansByUserIdService } from "@/lib/services/plan.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

// マイページ「旅行プラン」タブの完了済みプラン継続取得API（GATE-22種類B）。yearを指定すると
// startDateがその年のものだけに絞り込む（未指定は全期間、startDate未設定分も含む）。
// 本人限定のため認証必須・クライアントからuserIdを受け取らず常にセッションのuserIdを使う
async function handleGET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;

    const result = await findCompletedPlansByUserIdService({ userId: session.user.id, year, cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
