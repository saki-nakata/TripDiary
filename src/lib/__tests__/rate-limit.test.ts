import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  getClientIp,
  __resetRateLimitForTests,
  __getBucketsSizeForTests,
  __MAX_BUCKETS_FOR_TESTS,
} from "@/lib/rate-limit";
import { RateLimitError } from "@/lib/errors";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
    vi.useRealTimers();
  });

  it("上限回数以内_エラーを投げない", () => {
    for (let i = 0; i < 5; i++) {
      expect(() => checkRateLimit("key-a", 5, 1000)).not.toThrow();
    }
  });

  it("上限回数を超過_RateLimitErrorを投げる", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("key-b", 5, 1000);
    expect(() => checkRateLimit("key-b", 5, 1000)).toThrow(RateLimitError);
  });

  it("異なるkeyは独立してカウントされる", () => {
    for (let i = 0; i < 5; i++) checkRateLimit("key-c", 5, 1000);
    expect(() => checkRateLimit("key-d", 5, 1000)).not.toThrow();
  });

  it("ウィンドウ経過後はカウントがリセットされる", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    for (let i = 0; i < 5; i++) checkRateLimit("key-e", 5, 1000);
    expect(() => checkRateLimit("key-e", 5, 1000)).toThrow(RateLimitError);

    vi.setSystemTime(1001);
    expect(() => checkRateLimit("key-e", 5, 1000)).not.toThrow();
    vi.useRealTimers();
  });

  it("DISABLE_RATE_LIMIT_FOR_TESTSがtrue_上限回数を超過してもエラーを投げない", () => {
    const original = process.env.DISABLE_RATE_LIMIT_FOR_TESTS;
    process.env.DISABLE_RATE_LIMIT_FOR_TESTS = "true";
    try {
      for (let i = 0; i < 10; i++) {
        expect(() => checkRateLimit("key-f", 5, 1000)).not.toThrow();
      }
    } finally {
      process.env.DISABLE_RATE_LIMIT_FOR_TESTS = original;
    }
  });

  it("ENABLE_TEST_ENDPOINTSがtrueでもバイパスされない（GATE-03、フラグ分離）", () => {
    const originalDisable = process.env.DISABLE_RATE_LIMIT_FOR_TESTS;
    const originalEnableTestEndpoints = process.env.ENABLE_TEST_ENDPOINTS;
    delete process.env.DISABLE_RATE_LIMIT_FOR_TESTS;
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    try {
      for (let i = 0; i < 5; i++) checkRateLimit("key-g", 5, 1000);
      expect(() => checkRateLimit("key-g", 5, 1000)).toThrow(RateLimitError);
    } finally {
      process.env.DISABLE_RATE_LIMIT_FOR_TESTS = originalDisable;
      process.env.ENABLE_TEST_ENDPOINTS = originalEnableTestEndpoints;
    }
  });

  // GATE-20: メモリ上限対策（満了スイープ＋件数上限時の新規キー拒否）。
  // 「最古のバケットを追い出す」LRU方式は、login:${email}のようにIPに基づかない
  // キー設計と組み合わさるとブルートフォース対策を無効化するため採用しない
  // （攻撃者が大量の新規メールアドレスでログイン試行し、標的アカウントのバケットを
  // 追い出せてしまう）。生きているバケットは絶対に追い出さず、新規キー側を制限する。

  it("満了エントリは新規キー追加時にスイープされ、保有バケット数に含まれない", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    checkRateLimit("sweep-old", 5, 1000);
    expect(__getBucketsSizeForTests()).toBe(1);

    vi.setSystemTime(1001); // sweep-oldのウィンドウが満了
    checkRateLimit("sweep-new", 5, 1000); // 新規キー追加時にスイープが走る
    expect(__getBucketsSizeForTests()).toBe(1); // sweep-oldが除去され、sweep-newのみ残る
    vi.useRealTimers();
  });

  it("保有バケット数が上限に達していても、既存キーへのアクセスは影響を受けない（追い出されない）", () => {
    for (let i = 0; i < __MAX_BUCKETS_FOR_TESTS; i++) {
      checkRateLimit(`fill-${i}`, 100, 60_000);
    }
    expect(__getBucketsSizeForTests()).toBe(__MAX_BUCKETS_FOR_TESTS);

    // 既存キー（先頭に追加したもの）への再アクセスは通常どおりカウントされる
    expect(() => checkRateLimit("fill-0", 100, 60_000)).not.toThrow();
  });

  it("保有バケット数が上限に達している場合、新規キーは即座にRateLimitErrorになる", () => {
    for (let i = 0; i < __MAX_BUCKETS_FOR_TESTS; i++) {
      checkRateLimit(`fill2-${i}`, 100, 60_000);
    }
    expect(() => checkRateLimit("brand-new-key", 100, 60_000)).toThrow(RateLimitError);
  });

  it("満了により空きが出れば、上限到達後でも新規キーが再び受け入れられる", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    for (let i = 0; i < __MAX_BUCKETS_FOR_TESTS; i++) {
      checkRateLimit(`fill3-${i}`, 100, 1000);
    }
    expect(() => checkRateLimit("blocked-key", 100, 1000)).toThrow(RateLimitError);

    vi.setSystemTime(1001); // 全バケットのウィンドウが満了
    expect(() => checkRateLimit("accepted-key", 100, 1000)).not.toThrow();
    vi.useRealTimers();
  });
});

describe("getClientIp", () => {
  it("x-forwarded-forヘッダがある場合_最左のIPを返す", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("x-forwarded-forヘッダが無い場合_unknownを返す", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
