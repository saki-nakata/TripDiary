import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/post.service", () => ({
  getPortalDataService: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { getPortalDataService } from "@/lib/services/post.service";
import { GET } from "@/app/api/posts/portal/route";

describe("GET /api/posts/portal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_ポータルデータ_200", async () => {
    vi.mocked(getPortalDataService).mockResolvedValue({ areas: [] } as never);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ areas: [] });
  });
});
