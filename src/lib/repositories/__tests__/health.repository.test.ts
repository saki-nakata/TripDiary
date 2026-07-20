import { describe, it, expect } from "vitest";
import { pingDatabase } from "@/lib/repositories/health.repository";

describe("health.repository", () => {
  it("pingDatabase_DB接続済み_例外を投げずに解決する", async () => {
    await expect(pingDatabase()).resolves.toBeUndefined();
  });
});
