import { describe, it, expect } from "vitest";
import { statsYearQuerySchema } from "@/lib/validations/stats";

describe("statsYearQuerySchema", () => {
  it("year_正常な数値文字列_成功", () => {
    const result = statsYearQuerySchema.safeParse({ year: "2026" });
    expect(result.success).toBe(true);
  });

  it("year_数値でない文字列_失敗", () => {
    const result = statsYearQuerySchema.safeParse({ year: "abc" });
    expect(result.success).toBe(false);
  });

  it("year_null（未指定）_失敗", () => {
    const result = statsYearQuerySchema.safeParse({ year: null });
    expect(result.success).toBe(false);
  });

  it("year_下限2000_成功(境界値)", () => {
    const result = statsYearQuerySchema.safeParse({ year: "2000" });
    expect(result.success).toBe(true);
  });

  it("year_下限未満1999_失敗(境界値)", () => {
    const result = statsYearQuerySchema.safeParse({ year: "1999" });
    expect(result.success).toBe(false);
  });

  it("year_all_成功", () => {
    const result = statsYearQuerySchema.safeParse({ year: "all" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.year).toBe("all");
  });
});
