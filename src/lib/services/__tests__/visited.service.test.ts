import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/visited.repository", () => ({
  toggleVisited: vi.fn(),
}));

import { toggleVisited } from "@/lib/repositories/visited.repository";
import { toggleVisitedService } from "@/lib/services/visited.service";

const USER_ID = "user-1";
const POST_ID = "post-1";

describe("toggleVisitedService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toggleVisited_repositoryの結果をそのまま返す", async () => {
    vi.mocked(toggleVisited).mockResolvedValue({ visited: true });

    const result = await toggleVisitedService(USER_ID, POST_ID);

    expect(result).toEqual({ visited: true });
    expect(toggleVisited).toHaveBeenCalledWith(USER_ID, POST_ID);
  });
});
