import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/notification.service", () => ({
  getUserNotifications: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/services/notification.service";
import { GET } from "@/app/api/notifications/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest("http://localhost/api/notifications"));

    expect(res.status).toBe(401);
    expect(getUserNotifications).not.toHaveBeenCalled();
  });

  it("GET_認証済み_200_既定のcursor/limitで呼ばれる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getUserNotifications).mockResolvedValue({ notifications: [], nextCursor: null, hasMore: false });

    const res = await GET(makeRequest("http://localhost/api/notifications"));

    expect(res.status).toBe(200);
    expect(getUserNotifications).toHaveBeenCalledWith(USER_ID, { cursor: undefined, limit: 20 });
  });

  it("GET_認証済み_cursor指定_そのままserviceへ渡る（GATE-22種類A）", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getUserNotifications).mockResolvedValue({ notifications: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/notifications?cursor=notif-5"));

    expect(getUserNotifications).toHaveBeenCalledWith(USER_ID, { cursor: "notif-5", limit: 20 });
  });

  it("GET_limitは50を超えて指定しても50に丸められる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getUserNotifications).mockResolvedValue({ notifications: [], nextCursor: null, hasMore: false });

    await GET(makeRequest("http://localhost/api/notifications?limit=999"));

    expect(getUserNotifications).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ limit: 50 }));
  });
});
