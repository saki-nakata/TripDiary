import { describe, it, expect } from "vitest";
import { formatDateSlash, formatRelativeTime, dateGroupLabel } from "@/lib/date";

describe("formatDateSlash", () => {
  it("月日を2桁ゼロ埋めした YYYY/MM/DD 形式を返す", () => {
    expect(formatDateSlash(new Date(2026, 6, 8))).toBe("2026/07/08");
  });

  it("文字列日付も受け付ける", () => {
    expect(formatDateSlash("2026-01-01")).toBe("2026/01/01");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  it("1分未満は「たった今」", () => {
    const d = new Date(now.getTime() - 30 * 1000);
    expect(formatRelativeTime(d, now)).toBe("たった今");
  });

  it("59分59秒後の境界でも「分前」表記になる(境界値)", () => {
    const d = new Date(now.getTime() - 59 * 60 * 1000);
    expect(formatRelativeTime(d, now)).toBe("59分前");
  });

  it("60分ちょうどは「時間前」表記に切り替わる(境界値)", () => {
    const d = new Date(now.getTime() - 60 * 60 * 1000);
    expect(formatRelativeTime(d, now)).toBe("1時間前");
  });

  it("23時間59分は「時間前」表記のまま(境界値)", () => {
    const d = new Date(now.getTime() - (23 * 60 + 59) * 60 * 1000);
    expect(formatRelativeTime(d, now)).toBe("23時間前");
  });

  it("24時間ちょうどは「日前」表記に切り替わる(境界値)", () => {
    const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d, now)).toBe("1日前");
  });

  it("6日は「日前」表記のまま(境界値)", () => {
    const d = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d, now)).toBe("6日前");
  });

  it("7日以上は日付表記（YYYY/MM/DD）に切り替わる(境界値)", () => {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(d, now)).toBe(formatDateSlash(d));
  });
});

describe("dateGroupLabel", () => {
  // 基準時刻: 2026-07-20（月）正午
  const now = new Date(2026, 6, 20, 12, 0, 0);

  it("同じ暦日は「今日」（時刻が現在より後でも暦日が同じなら今日）", () => {
    expect(dateGroupLabel(new Date(2026, 6, 20, 0, 0, 0), now)).toBe("今日");
  });

  it("暦日で1日前は「昨日」", () => {
    expect(dateGroupLabel(new Date(2026, 6, 19, 23, 59, 0), now)).toBe("昨日");
  });

  it("暦日で2日前〜6日前は「今週」", () => {
    expect(dateGroupLabel(new Date(2026, 6, 14), now)).toBe("今週");
  });

  it("暦日で7日前は同月なら「今月」に切り替わる(境界値)", () => {
    expect(dateGroupLabel(new Date(2026, 6, 13), now)).toBe("今月");
  });

  it("同じ月内なら「今月」", () => {
    expect(dateGroupLabel(new Date(2026, 6, 1), now)).toBe("今月");
  });

  it("月をまたぐと「それ以前」", () => {
    expect(dateGroupLabel(new Date(2026, 5, 30), now)).toBe("それ以前");
  });

  it("年をまたぐと「それ以前」(境界値)", () => {
    expect(dateGroupLabel(new Date(2025, 6, 20), now)).toBe("それ以前");
  });
});
