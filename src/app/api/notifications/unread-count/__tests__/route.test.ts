import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/notification.service", () => ({
  getUnreadCountService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getUnreadCountService } from "@/lib/services/notification.service";
import { GET } from "@/app/api/notifications/unread-count/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_未認証_0件を返す", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ count: 0 });
    expect(getUnreadCountService).not.toHaveBeenCalled();
  });

  it("GET_認証済み_未読数を返す", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(getUnreadCountService).mockResolvedValue(5);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ count: 5 });
    expect(getUnreadCountService).toHaveBeenCalledWith(USER_ID);
  });
});
