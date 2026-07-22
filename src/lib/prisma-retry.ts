import { Prisma } from "@prisma/client";

const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 50;

function isDeadlockError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
}

/**
 * 同一行への同時書き込みでPrismaが投げるP2034（write conflict / deadlock）を検知し、
 * 短いバックオフを挟んでリトライする。$transactionは失敗時に自動でロールバック済みのため、
 * 渡された関数を丸ごと再実行しても副作用は残らない。
 * Phase 5-Bの負荷試験で、人気投稿への同時いいね/コメントがこのエラーで素通しの500になる
 * ことが実測で判明し、performance/seed.tsで既に使っていた対策を本番コードにも適用した。
 */
export async function withDeadlockRetry<T>(fn: () => Promise<T>, retries = DEFAULT_RETRIES): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries || !isDeadlockError(e)) throw e;
      await new Promise((resolve) => setTimeout(resolve, BASE_DELAY_MS * (attempt + 1)));
    }
  }
}
