import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/health.repository", () => ({
  pingDatabase: vi.fn(),
}));

import { pingDatabase } from "@/lib/repositories/health.repository";
import { checkHealthService } from "@/lib/services/health.service";

describe("checkHealthService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DB疎通成功_repositoryを呼び出し正常終了する", async () => {
    vi.mocked(pingDatabase).mockResolvedValue();

    await expect(checkHealthService()).resolves.toBeUndefined();
    expect(pingDatabase).toHaveBeenCalled();
  });

  it("DB疎通失敗_repositoryの例外がそのまま伝播する", async () => {
    vi.mocked(pingDatabase).mockRejectedValue(new Error("connection refused"));

    await expect(checkHealthService()).rejects.toThrow("connection refused");
  });
});
