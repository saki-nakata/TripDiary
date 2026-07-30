import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  findCommentsReceivedByAuthorService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findCommentsReceivedByAuthorService } from "@/lib/services/user.service";
import { GET } from "@/app/api/users/[id]/comments-received/route";

const authMock = auth as unknown as Mock;
const AUTHOR_ID = "author-1";
const OTHER_ID = "other-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

function makeParams(id: string = AUTHOR_ID) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/users/[id]/comments-received（GATE-22種類B: 継続取得API、本人限定）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未認証_401かつserviceは呼ばれない", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/comments-received`), makeParams());

    expect(res.status).toBe(401);
    expect(findCommentsReceivedByAuthorService).not.toHaveBeenCalled();
  });

  it("認証済みだが本人でない_403かつserviceは呼ばれない", async () => {
    authMock.mockResolvedValue({ user: { id: OTHER_ID } } as never);

    const res = await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/comments-received`), makeParams());

    expect(res.status).toBe(403);
    expect(findCommentsReceivedByAuthorService).not.toHaveBeenCalled();
  });

  it("本人_200でauthorIdとcursor/limitが渡される", async () => {
    authMock.mockResolvedValue({ user: { id: AUTHOR_ID } } as never);
    vi.mocked(findCommentsReceivedByAuthorService).mockResolvedValue({ comments: [], nextCursor: null, hasMore: false });

    const res = await GET(makeRequest(`http://localhost/api/users/${AUTHOR_ID}/comments-received?cursor=c-1`), makeParams());

    expect(res.status).toBe(200);
    expect(findCommentsReceivedByAuthorService).toHaveBeenCalledWith({ authorId: AUTHOR_ID, cursor: "c-1", limit: 20 });
  });
});
