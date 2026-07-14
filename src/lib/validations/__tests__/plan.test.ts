import { describe, it, expect } from "vitest";
import { planSchema } from "@/lib/validations/plan";

const validPlan = {
  title: "京都・奈良 2泊3日",
};

describe("planSchema", () => {
  // ─── title ───
  it("title_60文字_成功", () => {
    const result = planSchema.safeParse({ ...validPlan, title: "あ".repeat(60) });
    expect(result.success).toBe(true);
  });

  it("title_61文字_失敗", () => {
    const result = planSchema.safeParse({ ...validPlan, title: "あ".repeat(61) });
    expect(result.success).toBe(false);
  });

  it("title_空文字_失敗", () => {
    const result = planSchema.safeParse({ ...validPlan, title: "" });
    expect(result.success).toBe(false);
  });

  // ─── startDate/endDate ───
  it("endDateがstartDate以降_成功", () => {
    const result = planSchema.safeParse({ ...validPlan, startDate: "2026-08-10", endDate: "2026-08-12" });
    expect(result.success).toBe(true);
  });

  it("endDateとstartDateが同日_成功(境界値)", () => {
    const result = planSchema.safeParse({ ...validPlan, startDate: "2026-08-10", endDate: "2026-08-10" });
    expect(result.success).toBe(true);
  });

  it("endDateがstartDateより前_失敗", () => {
    const result = planSchema.safeParse({ ...validPlan, startDate: "2026-08-12", endDate: "2026-08-10" });
    expect(result.success).toBe(false);
  });

  it("startDate/endDateともに未指定_成功（任意項目）", () => {
    const result = planSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it("startDateのみ指定_成功", () => {
    const result = planSchema.safeParse({ ...validPlan, startDate: "2026-08-10" });
    expect(result.success).toBe(true);
  });

  // ─── budgetBreakdown ───
  it("budgetBreakdown_amountが0_成功（境界値）", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      budgetBreakdown: [{ label: "交通費", amount: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it("budgetBreakdown_amountが負の数_失敗（境界値）", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      budgetBreakdown: [{ label: "交通費", amount: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("budgetBreakdown_labelが51文字_失敗", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      budgetBreakdown: [{ label: "あ".repeat(51), amount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  // ─── spots ───
  it("spots_postタイプ配列_成功", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      spots: [{ type: "post", postId: "post-1" }, { type: "post", postId: "post-2" }],
    });
    expect(result.success).toBe(true);
  });

  it("spots_freeタイプ_タイトルとエリア指定_成功", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      spots: [{ type: "free", title: "まだ投稿していないスポット", location: "東京都" }],
    });
    expect(result.success).toBe(true);
  });

  it("spots_freeタイプ_カテゴリ未指定_成功（任意項目）", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      spots: [{ type: "free", title: "まだ投稿していないスポット", location: "東京都" }],
    });
    expect(result.success).toBe(true);
  });

  it("spots_freeタイプ_タイトル空文字_失敗", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      spots: [{ type: "free", title: "", location: "東京都" }],
    });
    expect(result.success).toBe(false);
  });

  it("spots_freeタイプ_タイトル61文字_失敗", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      spots: [{ type: "free", title: "あ".repeat(61), location: "東京都" }],
    });
    expect(result.success).toBe(false);
  });

  it("spots_freeタイプ_エリア未指定_失敗", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      spots: [{ type: "free", title: "まだ投稿していないスポット" }],
    });
    expect(result.success).toBe(false);
  });

  it("spots_freeタイプ_エリア空文字_失敗", () => {
    const result = planSchema.safeParse({
      ...validPlan,
      spots: [{ type: "free", title: "まだ投稿していないスポット", location: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("spots_未指定_成功（任意項目）", () => {
    const result = planSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });
});
