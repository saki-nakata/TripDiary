import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError } from "@/lib/errors";

vi.mock("@/lib/repositories/user.repository", () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
}));
vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed-password"),
}));

import { findUserByEmail, createUser } from "@/lib/repositories/user.repository";
import { signupService } from "@/lib/services/auth.service";

const SIGNUP_INPUT = { nickname: "たろう", email: "taro@example.com", password: "password123" };

describe("signupService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── signup ───
  it("signup_メール重複あり_ConflictErrorかつユーザー作成が呼ばれない", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue({ id: "existing-user" } as never);

    await expect(signupService(SIGNUP_INPUT)).rejects.toThrow(ConflictError);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("signup_メール重複なし_ハッシュ化されたパスワードでユーザーが作成される", async () => {
    vi.mocked(findUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue({ id: "new-user" } as never);

    await signupService(SIGNUP_INPUT);

    expect(createUser).toHaveBeenCalledWith({
      nickname: SIGNUP_INPUT.nickname,
      email: SIGNUP_INPUT.email,
      password: "hashed-password",
    });
  });
});
