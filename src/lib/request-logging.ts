import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 動的ルートのctx型はファイル毎に異なるため、汎用ラッパーの型はanyで受けてHにそのまま透過させる
export type AnyRouteHandler = (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse;

/**
 * handleApiError()はエラー時のみログを出すため、正常系を含む全リクエストの
 * method/path/status/duration_ms/userId/requestIdをここで一元的に記録する。
 * 動的ルート（[id]等）は第2引数{ params }を受け取り、静的ルートは受け取らないため、
 * ジェネリクスHで元のハンドラの引数の数・型をそのまま保持する（Controllerテストが
 * `GET()`のように引数無しで直接呼び出すケースも壊さない）。
 */
export function withRequestLogging<H extends AnyRouteHandler>(handler: H): H {
  return (async (req: NextRequest, ...args: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const start = Date.now();
    const requestId = randomUUID();
    const res = await handler(req, ...args);

    let userId: string | undefined;
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Next.jsのリクエストスコープ外（Controllerテスト等）で呼ばれた場合は取得しない
    }

    logger.info(
      {
        requestId,
        // Controllerテストの一部は引数無しでハンドラを直接呼び出すため（本番のNext.jsは常にreqを渡す）、
        // reqが無いケースでもクラッシュしないようoptional chainingで守る
        method: req?.method,
        path: req ? new URL(req.url).pathname : undefined,
        status: res.status,
        duration_ms: Date.now() - start,
        userId,
      },
      "API request completed"
    );

    return res;
  }) as H;
}
