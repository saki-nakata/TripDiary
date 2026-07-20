import { NextResponse } from "next/server";
import { checkHealthService } from "@/lib/services/health.service";
import { logger } from "@/lib/logger";
import { withRequestLogging } from "@/lib/request-logging";

export const runtime = "nodejs";

// k6の疎通確認、Phase 6のNginx/PM2ヘルスチェックの両方から使う軽量エンドポイント。
// 認証不要（監視対象として外形から叩けることを優先する）。
async function handleGET() {
  try {
    await checkHealthService();
    return NextResponse.json({ status: "ok" });
  } catch (e) {
    logger.error({ err: e }, "Health check failed: database unreachable");
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}

export const GET = withRequestLogging(handleGET);
