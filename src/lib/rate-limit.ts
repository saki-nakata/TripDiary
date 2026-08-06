import { RateLimitError } from "@/lib/errors";

type Bucket = { count: number; resetAt: number };

// 固定ウィンドウ方式のインメモリカウンタ（モジュール内メモリキャッシュ）。
// notification.service.ts の sweepStaleNotificationsThrottled と同方式。
// 単一プロセス（Phase 6はEC2 t2.micro 1台構成）を前提とする。複数インスタンスに
// スケールする場合はRedis等の外部ストアに置き換える必要がある。
const buckets = new Map<string, Bucket>();

// t2.micro（1GB RAM）でのメモリ圧迫を防ぐための保有バケット数上限（GATE-20）。
// 上限到達時は「新規キーを拒否する」方式のみを採る（生きているバケットは絶対に追い出さない）。
// login:${email} 等、キーがIPアドレスに基づかない用途があるため、最古のバケットを追い出す
// LRU方式だと、大量の新規キー（例: ランダムなメールアドレスでの大量ログイン試行）で標的の
// バケットそのものを追い出せてしまい、レート制限の解除と等価になる。
const MAX_BUCKETS = 5000;

function sweepExpiredBuckets(now: number): void {
  for (const [k, v] of buckets) {
    if (now >= v.resetAt) {
      buckets.delete(k);
    }
  }
}

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
  // DISABLE_RATE_LIMIT_FOR_TESTS は「本番環境変数には絶対設定しない」運用のフラグのため、これのみで判定する。
  // ENABLE_TEST_ENDPOINTS（/api/test/cleanupの有効化）とは意図的に別フラグにしている。同一フラグだと
  // 本番に誤って設定された場合、認証なしアカウント削除とレート制限の全解除が同時に成立してしまうため（GATE-03）。
  if (process.env.DISABLE_RATE_LIMIT_FOR_TESTS === "true") {
    return;
  }

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // 新規キー（Mapにまだ存在しない）を追加する場合のみ、上限チェックの対象にする。
    // 既存キーのウィンドウ満了によるリセットはMapのサイズを変えないため対象外。
    if (!buckets.has(key)) {
      sweepExpiredBuckets(now);
      if (buckets.size >= MAX_BUCKETS) {
        throw new RateLimitError();
      }
    }
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

export function __getBucketsSizeForTests(): number {
  return buckets.size;
}

export const __MAX_BUCKETS_FOR_TESTS = MAX_BUCKETS;

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
