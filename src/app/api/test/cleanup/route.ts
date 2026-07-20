import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withRequestLogging } from "@/lib/request-logging";

async function handleDELETE(req: NextRequest) {
  // NODE_ENV ではなく専用フラグでガードする。CIのe2eジョブは本番相当ビルド
  // （NODE_ENV=production）でアプリを起動するが、既存E2Eはこのエンドポイントに
  // 依存するため NODE_ENV では判定できない。Phase 6の本番環境変数には
  // ENABLE_TEST_ENDPOINTS を設定しないこと。
  if (process.env.ENABLE_TEST_ENDPOINTS !== "true") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  try {
    await prisma.user.deleteMany({ where: { email } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "test cleanup failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const DELETE = withRequestLogging(handleDELETE);
