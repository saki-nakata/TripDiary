import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/post.service", () => ({
  getLocationsService: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { getLocationsService } from "@/lib/services/post.service";
import { GET } from "@/app/api/posts/locations/route";

describe("GET /api/posts/locations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_エリア一覧_200", async () => {
    vi.mocked(getLocationsService).mockResolvedValue({
      locations: [{ location: "東京都", count: 3 }],
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ locations: [{ location: "東京都", count: 3 }] });
  });
});
