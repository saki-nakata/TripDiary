import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, getClientIp, __resetRateLimitForTests } from "@/lib/rate-limit";
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

  it("ENABLE_TEST_ENDPOINTSがtrue_上限回数を超過してもエラーを投げない", () => {
    const original = process.env.ENABLE_TEST_ENDPOINTS;
    process.env.ENABLE_TEST_ENDPOINTS = "true";
    try {
      for (let i = 0; i < 10; i++) {
        expect(() => checkRateLimit("key-f", 5, 1000)).not.toThrow();
      }
    } finally {
      process.env.ENABLE_TEST_ENDPOINTS = original;
    }
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
