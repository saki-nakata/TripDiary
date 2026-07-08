import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError } from "@/lib/errors";

vi.mock("@/lib/repositories/follow.repository", () => ({
  toggleFollow: vi.fn(),
}));
vi.mock("@/lib/services/notification.service", () => ({
  createFollowNotification: vi.fn(),
}));

import { toggleFollow } from "@/lib/repositories/follow.repository";
import { createFollowNotification } from "@/lib/services/notification.service";
import { toggleFollowService } from "@/lib/services/follow.service";

const FOLLOWER_ID = "user-1";
const FOLLOWING_ID = "user-2";

describe("toggleFollowService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── 自己フォロー ───
  it("toggleFollow_自分自身をフォロー_ValidationErrorかつtoggleFollowは呼ばれない", async () => {
    await expect(toggleFollowService(FOLLOWER_ID, FOLLOWER_ID)).rejects.toThrow(ValidationError);
    expect(toggleFollow).not.toHaveBeenCalled();
  });

  // ─── フォロー ───
  it("toggleFollow_フォローON_通知が作成される", async () => {
    vi.mocked(toggleFollow).mockResolvedValue({ following: true });

    const result = await toggleFollowService(FOLLOWER_ID, FOLLOWING_ID);

    expect(result).toEqual({ following: true });
    expect(createFollowNotification).toHaveBeenCalledWith(FOLLOWER_ID, FOLLOWING_ID);
  });

  it("toggleFollow_フォローOFF_通知は作成されない", async () => {
    vi.mocked(toggleFollow).mockResolvedValue({ following: false });

    await toggleFollowService(FOLLOWER_ID, FOLLOWING_ID);

    expect(createFollowNotification).not.toHaveBeenCalled();
  });
});
