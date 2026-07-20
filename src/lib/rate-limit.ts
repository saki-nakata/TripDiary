import { RateLimitError } from "@/lib/errors";

type Bucket = { count: number; resetAt: number };

// 固定ウィンドウ方式のインメモリカウンタ（モジュール内メモリキャッシュ）。
// notification.service.ts の sweepStaleNotificationsThrottled と同方式。
// 単一プロセス（Phase 6はEC2 t2.micro 1台構成）を前提とする。複数インスタンスに
// スケールする場合はRedis等の外部ストアに置き換える必要がある。
const buckets = new Map<string, Bucket>();

/**
 * `key` ごとに `windowMs` の固定ウィンドウで `limit` 回までのアクセスを許容する。
 * 超過時は `RateLimitError` を投げる（呼び出し元でハンドリングする）。
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): void {
  // E2E/CIはローカル実行同様、単一の永続プロセス（next start）に対して複数のspecファイルが
  // 同じテストユーザーで繰り返しログインするため、実際の攻撃と区別できずすぐに誤爆する。
  // NODE_ENV では判定できない点に注意（test/cleanup と同じ理由）：`next build`/`next start`は
  // 常に NODE_ENV=production で動作するため、CIのe2eジョブ（本番相当ビルド）では
  // `NODE_ENV !== "production"` が常にfalseになりガードとして機能しない。
  // ENABLE_TEST_ENDPOINTS は「本番環境変数には絶対設定しない」運用のフラグのため、これのみで判定する。
  if (process.env.ENABLE_TEST_ENDPOINTS === "true") {
    return;
  }

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new RateLimitError();
  }
  bucket.count += 1;
}

export function __resetRateLimitForTests() {
  buckets.clear();
}

/**
 * クライアントIPを取得する。`x-forwarded-for` ヘッダの最左要素を採用する。
 * Phase 6 は EC2 + Nginx のリバースプロキシ構成を想定しており、
 * **信頼できるプロキシ配下でのみ有効**（プロキシを経由しないローカル実行や、
 * ヘッダを偽装できる直接公開環境では信頼できない値になる点に注意）。
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
