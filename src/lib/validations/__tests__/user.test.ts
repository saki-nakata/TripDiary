import { describe, it, expect } from "vitest";
import { userUpdateSchema } from "@/lib/validations/user";

const validUser = {
  nickname: "テストユーザー",
};

describe("userUpdateSchema", () => {
  // ─── nickname ───
  it("nickname_20文字_成功", () => {
    const result = userUpdateSchema.safeParse({ ...validUser, nickname: "あ".repeat(20) });
    expect(result.success).toBe(true);
  });

  it("nickname_21文字_失敗", () => {
    const result = userUpdateSchema.safeParse({ ...validUser, nickname: "あ".repeat(21) });
    expect(result.success).toBe(false);
  });

  it("nickname_空文字_失敗", () => {
    const result = userUpdateSchema.safeParse({ ...validUser, nickname: "" });
    expect(result.success).toBe(false);
  });

  // ─── bio ───
  it("bio_200文字_成功", () => {
    const result = userUpdateSchema.safeParse({ ...validUser, bio: "あ".repeat(200) });
    expect(result.success).toBe(true);
  });

  it("bio_201文字_失敗", () => {
    const result = userUpdateSchema.safeParse({ ...validUser, bio: "あ".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("bio_null_成功", () => {
    const result = userUpdateSchema.safeParse({ ...validUser, bio: null });
    expect(result.success).toBe(true);
  });

  it("bio_未指定_成功", () => {
    const result = userUpdateSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  // ─── image ───
  it("image_null_成功", () => {
    const result = userUpdateSchema.safeParse({ ...validUser, image: null });
    expect(result.success).toBe(true);
  });

  it("image_未指定_成功", () => {
    const result = userUpdateSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });
});
