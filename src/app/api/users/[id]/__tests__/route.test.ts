import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  getUserProfileService: vi.fn(),
  updateUserService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getUserProfileService, updateUserService } from "@/lib/services/user.service";
import { GET, PUT } from "@/app/api/users/[id]/route";

const authMock = auth as unknown as Mock;

const USER_ID = "user-1";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("GET /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── GET ───
  it("GET_ユーザーが存在しない_404", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(getUserProfileService).mockRejectedValue(new NotFoundError());

    const res = await GET(makeRequest(`http://localhost/api/users/${USER_ID}`), makeParams(USER_ID));

    expect(res.status).toBe(404);
  });

  it("GET_未認証でも200かつプロフィールを返す", async () => {
    authMock.mockResolvedValue(null);
    vi.mocked(getUserProfileService).mockResolvedValue({
      id: USER_ID,
      nickname: "たろう",
      image: null,
      bio: null,
      postCount: 0,
      followerCount: 0,
      followingCount: 0,
      followedByCurrentUser: false,
      tabiScore: 0,
      tabiRank: "ブロンズトラベラー",
    });

    const res = await GET(makeRequest(`http://localhost/api/users/${USER_ID}`), makeParams(USER_ID));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).not.toHaveProperty("email");
    expect(getUserProfileService).toHaveBeenCalledWith(USER_ID, undefined);
  });
});

describe("PUT /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── PUT ───
  it("PUT_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PUT(
      makeRequest(`http://localhost/api/users/${USER_ID}`, {
        method: "PUT",
        body: JSON.stringify({ nickname: "たろう" }),
      }),
      makeParams(USER_ID)
    );

    expect(res.status).toBe(401);
    expect(updateUserService).not.toHaveBeenCalled();
  });

  it("PUT_バリデーションエラー(ニックネーム21文字)_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await PUT(
      makeRequest(`http://localhost/api/users/${USER_ID}`, {
        method: "PUT",
        body: JSON.stringify({ nickname: "あ".repeat(21) }),
      }),
      makeParams(USER_ID)
    );

    expect(res.status).toBe(400);
    expect(updateUserService).not.toHaveBeenCalled();
  });

  it("PUT_他人のプロフィール編集_403", async () => {
    authMock.mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(updateUserService).mockRejectedValue(new ForbiddenError());

    const res = await PUT(
      makeRequest(`http://localhost/api/users/${USER_ID}`, {
        method: "PUT",
        body: JSON.stringify({ nickname: "たろう" }),
      }),
      makeParams(USER_ID)
    );

    expect(res.status).toBe(403);
  });

  it("PUT_本人が正しい入力で更新_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(updateUserService).mockResolvedValue({ id: USER_ID, nickname: "たろう2", bio: null, image: null });

    const res = await PUT(
      makeRequest(`http://localhost/api/users/${USER_ID}`, {
        method: "PUT",
        body: JSON.stringify({ nickname: "たろう2" }),
      }),
      makeParams(USER_ID)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nickname).toBe("たろう2");
  });
});
