import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { runWithRequestContext } from "@/lib/request-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 動的ルートのctx型はファイル毎に異なるため、汎用ラッパーの型はanyで受けてHにそのまま透過させる
export type AnyRouteHandler = (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse;

// Nginx/PM2から5秒間隔等でポーリングされる想定のため、アクセスログ出力とuserId解決用の
// auth()呼び出し（セッションデコード）の両方をスキップする対象パス（GATE-35）。
// ハンドラ自体の実行はスキップしない（ヘルスチェック失敗時のlogger.errorはroute.ts側に既存）。
const SKIP_ACCESS_LOG_PATHS = new Set(["/api/health"]);

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
    // Controllerテストの一部は引数無しでハンドラを直接呼び出すため（本番のNext.jsは常にreqを渡す）、
    // reqが無いケースでもクラッシュしないようoptional chainingで守る
    const method = req?.method;
    const path = req ? new URL(req.url).pathname : undefined;

    if (path && SKIP_ACCESS_LOG_PATHS.has(path)) {
      return runWithRequestContext({ requestId, method, path }, () => handler(req, ...args));
    }

    // handlerがthrowした場合もアクセスログを1行残すため、resの代入とログ出力をtry/finallyに分ける。
    // finally到達時点でresが未代入（＝throwされた）ならstatus 500として記録し、例外はそのまま再送出する。
    let res: NextResponse | undefined;
    try {
      res = await runWithRequestContext({ requestId, method, path }, () => handler(req, ...args));
      return res;
    } finally {
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
          method,
          path,
          status: res?.status ?? 500,
          duration_ms: Date.now() - start,
          userId,
        },
        "API request completed"
      );
    }
  }) as H;
}
