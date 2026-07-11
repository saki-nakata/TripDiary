import { describe, it, expect } from "vitest";
import { userUpdateSchema, passwordChangeSchema, emailChangeSchema } from "@/lib/validations/user";

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

const validPasswordChange = {
  currentPassword: "current-password",
  newPassword: "newpassword1",
  confirmNewPassword: "newpassword1",
};

describe("passwordChangeSchema", () => {
  // ─── newPassword ───
  it("newPassword_8文字_成功", () => {
    const result = passwordChangeSchema.safeParse({
      ...validPasswordChange,
      newPassword: "a".repeat(8),
      confirmNewPassword: "a".repeat(8),
    });
    expect(result.success).toBe(true);
  });

  it("newPassword_7文字_失敗(境界値)", () => {
    const result = passwordChangeSchema.safeParse({
      ...validPasswordChange,
      newPassword: "a".repeat(7),
      confirmNewPassword: "a".repeat(7),
    });
    expect(result.success).toBe(false);
  });

  // ─── confirmNewPassword ───
  it("confirmNewPasswordがnewPasswordと不一致_失敗", () => {
    const result = passwordChangeSchema.safeParse({
      ...validPasswordChange,
      confirmNewPassword: "different-password",
    });
    expect(result.success).toBe(false);
  });

  // ─── currentPassword ───
  it("currentPassword_空文字_失敗", () => {
    const result = passwordChangeSchema.safeParse({ ...validPasswordChange, currentPassword: "" });
    expect(result.success).toBe(false);
  });
});

const validEmailChange = {
  email: "new@example.com",
  currentPassword: "current-password",
};

describe("emailChangeSchema", () => {
  // ─── email ───
  it("email_正しい形式_成功", () => {
    const result = emailChangeSchema.safeParse(validEmailChange);
    expect(result.success).toBe(true);
  });

  it("email_不正な形式_失敗", () => {
    const result = emailChangeSchema.safeParse({ ...validEmailChange, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("email_空文字_失敗", () => {
    const result = emailChangeSchema.safeParse({ ...validEmailChange, email: "" });
    expect(result.success).toBe(false);
  });

  // ─── currentPassword ───
  it("currentPassword_空文字_失敗", () => {
    const result = emailChangeSchema.safeParse({ ...validEmailChange, currentPassword: "" });
    expect(result.success).toBe(false);
  });
});
