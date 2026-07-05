import { logger } from "./logger";

/**
 * エラー監視SaaS（Sentry等）への送信の唯一の差し込み口。
 *
 * Phase 2.5-D の時点では実際のSaaS連携（SDK導入・DSN設定）は行わず、
 * 「未捕捉例外をここに集約する」構造だけを用意している。
 * SENTRY_DSN 等が未設定の環境（開発・現状の本番）では no-op で、
 * 監視SaaSを導入する際にこの関数の中身を差し替えるだけで全体に反映される。
 *
 * 送信対象は 5xx 系（未捕捉例外）のみ。想定内の 4xx（ValidationError 等）は
 * クライアント起因のため送らない（ノイズを避ける）方針。
 */

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

type CaptureContext = {
  /** 発生箇所（例: "api/posts POST"）。将来 Sentry の tag に載せる */
  source?: string;
  /** ログインユーザーID。個人情報はIDのみに留める */
  userId?: string;
};

export function captureException(error: unknown, context?: CaptureContext): void {
  if (!dsn) {
    // 監視SaaS未設定。ここでは何もしない（ログ出力は handleApiError 側で完結）。
    return;
  }

  // ── 監視SaaS導入時はこの分岐に実際の送信を実装する ──
  // 例: Sentry.captureException(error, { tags: { source }, user: { id: userId } });
  // 現状は「DSNは設定されているがSDK未導入」の保険として、送信予定であることをログに残す。
  logger.debug({ source: context?.source, userId: context?.userId }, "monitoring: captureException (no SDK wired yet)");
}
