import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/notification.service", () => ({
  markAsReadService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { markAsReadService } from "@/lib/services/notification.service";
import { PATCH } from "@/app/api/notifications/[id]/read/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const NOTIFICATION_ID = "notification-1";

function makeParams() {
  return { params: Promise.resolve({ id: NOTIFICATION_ID }) };
}

describe("PATCH /api/notifications/[id]/read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(
      new Request(`http://localhost/api/notifications/${NOTIFICATION_ID}/read`, { method: "PATCH" }),
      makeParams(),
    );

    expect(res.status).toBe(401);
    expect(markAsReadService).not.toHaveBeenCalled();
  });

  it("PATCH_認証済み_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(markAsReadService).mockResolvedValue({} as never);

    const res = await PATCH(
      new Request(`http://localhost/api/notifications/${NOTIFICATION_ID}/read`, { method: "PATCH" }),
      makeParams(),
    );

    expect(res.status).toBe(200);
    expect(markAsReadService).toHaveBeenCalledWith(NOTIFICATION_ID, USER_ID);
  });
});
