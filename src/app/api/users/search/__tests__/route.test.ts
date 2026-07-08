import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  searchUsersService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { searchUsersService } from "@/lib/services/user.service";
import { GET } from "@/app/api/users/search/route";

const authMock = auth as unknown as Mock;

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/users/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(searchUsersService).mockResolvedValue({ users: [], nextCursor: null, hasMore: false });
  });

  it("GET_qパラメータなし_空文字でserviceが呼ばれる", async () => {
    const res = await GET(makeRequest("http://localhost/api/users/search"));

    expect(res.status).toBe(200);
    expect(searchUsersService).toHaveBeenCalledWith({
      q: "",
      cursor: undefined,
      limit: 20,
      viewerId: undefined,
    });
  });

  it("GET_qパラメータあり_serviceにそのまま渡される", async () => {
    await GET(makeRequest("http://localhost/api/users/search?q=たろう"));

    expect(searchUsersService).toHaveBeenCalledWith({
      q: "たろう",
      cursor: undefined,
      limit: 20,
      viewerId: undefined,
    });
  });

  it("GET_認証済み_viewerIdがserviceに渡される", async () => {
    authMock.mockResolvedValue({ user: { id: "viewer-1" } } as never);

    await GET(makeRequest("http://localhost/api/users/search"));

    expect(searchUsersService).toHaveBeenCalledWith({
      q: "",
      cursor: undefined,
      limit: 20,
      viewerId: "viewer-1",
    });
  });

  it("GET_正常系_serviceの結果をそのまま返す", async () => {
    vi.mocked(searchUsersService).mockResolvedValue({
      users: [{ id: "u1", nickname: "たろう" } as never],
      nextCursor: null,
      hasMore: false,
    });

    const res = await GET(makeRequest("http://localhost/api/users/search?q=たろう"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.users).toHaveLength(1);
  });
});
