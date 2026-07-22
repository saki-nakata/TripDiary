import { describe, it, expect, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { withDeadlockRetry } from "@/lib/prisma-retry";

function deadlockError() {
  return new Prisma.PrismaClientKnownRequestError("Transaction failed due to a write conflict or a deadlock.", {
    code: "P2034",
    clientVersion: "test",
  });
}

describe("withDeadlockRetry", () => {
  it("成功時_1回だけ実行して結果を返す", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withDeadlockRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("P2034が数回発生しても上限内でリトライして成功する", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(deadlockError())
      .mockRejectedValueOnce(deadlockError())
      .mockResolvedValue("ok");

    await expect(withDeadlockRetry(fn, 3)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("リトライ上限を超えてP2034が続く場合_最後のエラーを投げる", async () => {
    const fn = vi.fn().mockRejectedValue(deadlockError());
    await expect(withDeadlockRetry(fn, 2)).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(fn).toHaveBeenCalledTimes(3); // 初回 + リトライ2回
  });

  it("P2034以外のエラーはリトライせず即座に投げる", async () => {
    const other = new Error("some other failure");
    const fn = vi.fn().mockRejectedValue(other);
    await expect(withDeadlockRetry(fn, 3)).rejects.toThrow("some other failure");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
