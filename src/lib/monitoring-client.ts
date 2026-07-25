/**
 * フロントエンドの未捕捉クラッシュ（global-error.tsx）用の監視SaaS送信口。
 *
 * サーバー側の captureException（./monitoring.ts）は pino ロガーに依存しており、
 * "use client" コンポーネントから直接importするとNode専用のpino-pretty transport
 * （worker_threads使用）がクライアントバンドルに混入しビルドが壊れるため、
 * ロガー依存を持たないクライアント専用の薄い実装として分離する。
 *
 * サーバー側と同様、DSN未設定の環境（開発・現状の本番）ではno-op。
 */

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

type CaptureContext = {
  /** 発生箇所（例: "global-error"）。将来 Sentry の tag に載せる */
  source?: string;
};

export function captureClientException(error: unknown, context?: CaptureContext): void {
  if (!dsn) {
    // 監視SaaS未設定。ここでは何もしない。
    return;
  }

  // ── 監視SaaS導入時はこの分岐に実際の送信を実装する ──
  // 例: Sentry.captureException(error, { tags: { source: context?.source } });
  // 現状は「DSNは設定されているがSDK未導入」の保険として、送信予定であることをログに残す。
  console.error("[monitoring] captureClientException (no SDK wired yet)", context?.source, error);
}
