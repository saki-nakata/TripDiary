import { describe, it, expect } from "vitest";
import { assertPerfDatabase, assertPerfTruncateConfirmed, PERF_DATABASE_ALLOWLIST } from "./assert-perf-database";

describe("assertPerfDatabase", () => {
  it("正しいperf DBのURL_例外を投げない", () => {
    expect(() =>
      assertPerfDatabase(`mysql://tripdiary:tripdiary@${PERF_DATABASE_ALLOWLIST.host}:${PERF_DATABASE_ALLOWLIST.port}/${PERF_DATABASE_ALLOWLIST.database}`)
    ).not.toThrow();
  });

  it("DATABASE_URL未設定_例外を投げる", () => {
    expect(() => assertPerfDatabase(undefined)).toThrow(/DATABASE_URLが設定されていません/);
  });

  it("不正な形式のURL_例外を投げる", () => {
    expect(() => assertPerfDatabase("not-a-valid-url")).toThrow(/形式が不正です/);
  });

  it("本番相当のホスト名を指定_例外を投げる", () => {
    expect(() =>
      assertPerfDatabase("mysql://admin:password@tripdiary-prod.abcdefg.ap-northeast-1.rds.amazonaws.com:3306/tripdiary_prod")
    ).toThrow(/ホスト・ポート/);
  });

  it("テストDB(3307/tripdiary_test)を指定_例外を投げる", () => {
    expect(() => assertPerfDatabase("mysql://tripdiary_test:tripdiary_test@127.0.0.1:3307/tripdiary_test")).toThrow(
      /ホスト・ポート/
    );
  });

  it("開発DB(.env.local相当、ポート省略)を指定_例外を投げる", () => {
    expect(() => assertPerfDatabase("mysql://tripdiary:tripdiary@127.0.0.1/tripdiary")).toThrow(/ホスト・ポート/);
  });

  it("ホスト・ポートは正しいがDB名だけ異なる_例外を投げる", () => {
    expect(() =>
      assertPerfDatabase(`mysql://tripdiary:tripdiary@${PERF_DATABASE_ALLOWLIST.host}:${PERF_DATABASE_ALLOWLIST.port}/tripdiary_test`)
    ).toThrow(/データベース名/);
  });
});

describe("assertPerfTruncateConfirmed", () => {
  it("CONFIRM_PERF_TRUNCATE=true_例外を投げない", () => {
    expect(() => assertPerfTruncateConfirmed({ CONFIRM_PERF_TRUNCATE: "true" })).not.toThrow();
  });

  it("CONFIRM_PERF_TRUNCATE未設定_例外を投げる", () => {
    expect(() => assertPerfTruncateConfirmed({})).toThrow(/CONFIRM_PERF_TRUNCATE=true/);
  });

  it("CONFIRM_PERF_TRUNCATEが文字列true以外_例外を投げる", () => {
    expect(() => assertPerfTruncateConfirmed({ CONFIRM_PERF_TRUNCATE: "1" })).toThrow(/CONFIRM_PERF_TRUNCATE=true/);
  });
});
