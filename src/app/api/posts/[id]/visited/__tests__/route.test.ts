import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/visited.service", () => ({
  toggleVisitedService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { toggleVisitedService } from "@/lib/services/visited.service";
import { POST } from "@/app/api/posts/[id]/visited/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const POST_ID = "post-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

function makeParams() {
  return { params: Promise.resolve({ id: POST_ID }) };
}

describe("POST /api/posts/[id]/visited", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(makeRequest(`http://localhost/api/posts/${POST_ID}/visited`, { method: "POST" }), makeParams());

    expect(res.status).toBe(401);
    expect(toggleVisitedService).not.toHaveBeenCalled();
  });

  it("POST_正常系_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(toggleVisitedService).mockResolvedValue({ visited: true } as never);

    const res = await POST(makeRequest(`http://localhost/api/posts/${POST_ID}/visited`, { method: "POST" }), makeParams());

    expect(res.status).toBe(200);
    expect(toggleVisitedService).toHaveBeenCalledWith(USER_ID, POST_ID);
  });
});
