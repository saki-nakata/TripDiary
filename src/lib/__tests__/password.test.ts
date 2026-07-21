import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("bcryptjs", () => ({
  hash: vi.fn().mockResolvedValue("hashed"),
}));

import { hash } from "bcryptjs";
import { hashPassword } from "@/lib/password";

describe("hashPassword", () => {
  const originalCost = process.env.BCRYPT_COST;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BCRYPT_COST = originalCost;
  });

  it("BCRYPT_COST未設定_デフォルトコスト12でhashが呼ばれる", async () => {
    delete process.env.BCRYPT_COST;

    await hashPassword("password123");

    expect(hash).toHaveBeenCalledWith("password123", 12);
  });

  it("BCRYPT_COST設定あり_指定したコストでhashが呼ばれる", async () => {
    process.env.BCRYPT_COST = "4";

    await hashPassword("password123");

    expect(hash).toHaveBeenCalledWith("password123", 4);
  });

  it("BCRYPT_COSTが不正な値（数値でない）_デフォルトコスト12にフォールバックする", async () => {
    process.env.BCRYPT_COST = "invalid";

    await hashPassword("password123");

    expect(hash).toHaveBeenCalledWith("password123", 12);
  });

  it("BCRYPT_COSTが0以下_デフォルトコスト12にフォールバックする", async () => {
    process.env.BCRYPT_COST = "0";

    await hashPassword("password123");

    expect(hash).toHaveBeenCalledWith("password123", 12);
  });
});
