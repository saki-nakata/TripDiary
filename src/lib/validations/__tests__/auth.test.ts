import { describe, it, expect } from "vitest";
import { signupSchema, signupApiSchema, loginSchema } from "@/lib/validations/auth";

const validSignup = {
  nickname: "たろう",
  email: "taro@example.com",
  password: "password123",
  confirmPassword: "password123",
};

describe("signupSchema", () => {
  // ─── nickname ───
  it("nickname_20文字_成功", () => {
    const result = signupSchema.safeParse({ ...validSignup, nickname: "あ".repeat(20) });
    expect(result.success).toBe(true);
  });

  it("nickname_21文字_失敗", () => {
    const result = signupSchema.safeParse({ ...validSignup, nickname: "あ".repeat(21) });
    expect(result.success).toBe(false);
  });

  // ─── password ───
  it("password_8文字_成功", () => {
    const result = signupSchema.safeParse({ ...validSignup, password: "12345678", confirmPassword: "12345678" });
    expect(result.success).toBe(true);
  });

  it("password_7文字_失敗", () => {
    const result = signupSchema.safeParse({ ...validSignup, password: "1234567", confirmPassword: "1234567" });
    expect(result.success).toBe(false);
  });

  // ─── confirmPassword ───
  it("confirmPassword_不一致_失敗", () => {
    const result = signupSchema.safeParse({ ...validSignup, confirmPassword: "different-password" });
    expect(result.success).toBe(false);
  });

  // ─── email ───
  it("email_不正な形式_失敗", () => {
    const result = signupSchema.safeParse({ ...validSignup, email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("signupApiSchema", () => {
  it("confirmPassword_を含まない_成功", () => {
    const apiInput = {
      nickname: validSignup.nickname,
      email: validSignup.email,
      password: validSignup.password,
    };
    const result = signupApiSchema.safeParse(apiInput);
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("email_password_両方あり_成功", () => {
    const result = loginSchema.safeParse({ email: "taro@example.com", password: "anything" });
    expect(result.success).toBe(true);
  });

  it("email_空文字_失敗", () => {
    const result = loginSchema.safeParse({ email: "", password: "anything" });
    expect(result.success).toBe(false);
  });
});
