import { describe, it, expect, vi, beforeEach } from "vitest";

// authorizeCredentials自体をテスト対象にするため、@/lib/authはモックできない。
// モジュール読み込み時に実行される NextAuth({...}) 呼び出しの副作用（AUTH_SECRET未設定等）を
// 避けるため、next-auth本体・Credentialsプロバイダをモックする（他の多くのテストファイルが
// @/lib/auth自体を丸ごとモックしているのと同じ理由）。
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
  CredentialsSignin: class CredentialsSignin extends Error {
    code?: string;
  },
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: unknown) => config),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock("@node-rs/bcrypt", () => ({
  compare: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "203.0.113.5"),
}));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import { compare } from "@node-rs/bcrypt";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { RateLimitError } from "@/lib/errors";
import { authorizeCredentials } from "@/lib/auth";

const dummyRequest = new Request("http://localhost/api/auth/callback/credentials");

describe("authorizeCredentials", () => {
  beforeEach(() => vi.clearAllMocks());

  it("スキーマ不正_reason=invalid_formatでwarnログを出しnullを返す", async () => {
    const result = await authorizeCredentials({ email: "not-an-email" }, dummyRequest);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith({ reason: "invalid_format" }, "Login attempt failed");
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("レート制限超過_reason=rate_limitedでip・emailを含むwarnログを出しRateLimitSignInErrorを投げる", async () => {
    vi.mocked(checkRateLimit).mockImplementationOnce(() => {
      throw new RateLimitError();
    });

    await expect(
      authorizeCredentials({ email: "Taro@Example.com", password: "password123" }, dummyRequest)
    ).rejects.toThrow();

    expect(logger.warn).toHaveBeenCalledWith(
      { ip: "203.0.113.5", email: "taro@example.com", reason: "rate_limited" },
      "Login attempt failed"
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("ユーザー未存在_reason=invalid_credentialsでwarnログを出しnullを返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await authorizeCredentials(
      { email: "taro@example.com", password: "password123" },
      dummyRequest
    );

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { ip: "203.0.113.5", email: "taro@example.com", reason: "invalid_credentials" },
      "Login attempt failed"
    );
    expect(compare).not.toHaveBeenCalled();
  });

  it("パスワード不一致_reason=invalid_credentialsでwarnログを出しnullを返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      password: "hashed",
      nickname: "太郎",
      email: "taro@example.com",
      image: null,
    } as never);
    vi.mocked(compare).mockResolvedValue(false);

    const result = await authorizeCredentials(
      { email: "taro@example.com", password: "wrong-password" },
      dummyRequest
    );

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      { ip: "203.0.113.5", email: "taro@example.com", reason: "invalid_credentials" },
      "Login attempt failed"
    );
  });

  it("認証成功_warnログを出さずユーザー情報を返す", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      password: "hashed",
      nickname: "太郎",
      email: "taro@example.com",
      image: null,
    } as never);
    vi.mocked(compare).mockResolvedValue(true);

    const result = await authorizeCredentials(
      { email: "taro@example.com", password: "password123" },
      dummyRequest
    );

    expect(result).toEqual({ id: "user-1", nickname: "太郎", email: "taro@example.com", image: null });
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
