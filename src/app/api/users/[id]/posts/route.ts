import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findPostsByAuthorIdService } from "@/lib/services/post.service";
import { handleApiError } from "@/lib/api-error";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

// マイページ「自分の投稿」タブ・公開プロフィール「投稿」タブの両方から使う継続取得API（GATE-22種類A）。
// 未認証でも閲覧できる（公開プロフィールの投稿一覧は認証不要のため）。viewerIdはcost/costBreakdownの
// 表示可否判定にのみ使い、他人の投稿一覧を取得すること自体は誰でもできる
async function handleGET(req: NextRequest, { params }: Params) {
  try {
    const { id: authorId } = await params;
    const session = await auth();
    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const yearParam = searchParams.get("year");
    const year = yearParam ? Number(yearParam) : undefined;

    const result = await findPostsByAuthorIdService({
      authorId,
      viewerId: session?.user?.id,
      cursor,
      limit,
      year,
    });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
