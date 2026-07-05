import { describe, it, expect } from "vitest";
import { postSchema } from "@/lib/validations/post";

const validPost = {
  title: "テストスポット",
  body: "感想メモ",
  location: "東京都",
  category: "観光",
  visitedAt: "2026-01-01",
};

describe("postSchema", () => {
  // ─── title ───
  it("title_40文字_成功", () => {
    const result = postSchema.safeParse({ ...validPost, title: "あ".repeat(40) });
    expect(result.success).toBe(true);
  });

  it("title_41文字_失敗", () => {
    const result = postSchema.safeParse({ ...validPost, title: "あ".repeat(41) });
    expect(result.success).toBe(false);
  });

  it("title_空文字_失敗", () => {
    const result = postSchema.safeParse({ ...validPost, title: "" });
    expect(result.success).toBe(false);
  });

  // ─── rating ───
  it("rating_1_成功", () => {
    const result = postSchema.safeParse({ ...validPost, rating: 1 });
    expect(result.success).toBe(true);
  });

  it("rating_5_成功", () => {
    const result = postSchema.safeParse({ ...validPost, rating: 5 });
    expect(result.success).toBe(true);
  });

  it("rating_0_失敗", () => {
    const result = postSchema.safeParse({ ...validPost, rating: 0 });
    expect(result.success).toBe(false);
  });

  it("rating_6_失敗", () => {
    const result = postSchema.safeParse({ ...validPost, rating: 6 });
    expect(result.success).toBe(false);
  });

  it("rating_未指定_成功（任意項目）", () => {
    const result = postSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  // ─── category ───
  it("category_不正な値_失敗", () => {
    const result = postSchema.safeParse({ ...validPost, category: "存在しないカテゴリ" });
    expect(result.success).toBe(false);
  });

  // ─── body ───
  it("body_2000文字_成功", () => {
    const result = postSchema.safeParse({ ...validPost, body: "あ".repeat(2000) });
    expect(result.success).toBe(true);
  });

  it("body_2001文字_失敗", () => {
    const result = postSchema.safeParse({ ...validPost, body: "あ".repeat(2001) });
    expect(result.success).toBe(false);
  });
});
