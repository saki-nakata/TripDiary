import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

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

describe("GET /api/notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getUserNotifications).not.toHaveBeenCalled();
  });

  it("GET_認証済み_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getUserNotifications).mockResolvedValue([] as never);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(getUserNotifications).toHaveBeenCalledWith(USER_ID);
  });
});
