import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError } from "@/lib/errors";

vi.mock("@/lib/repositories/follow.repository", () => ({
  toggleFollow: vi.fn(),
  findFollowers: vi.fn(),
  findFollowing: vi.fn(),
  findFollowingIdsAmong: vi.fn(),
}));
vi.mock("@/lib/services/notification.service", () => ({
  createFollowNotification: vi.fn(),
}));

import { toggleFollow, findFollowers, findFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";
import { createFollowNotification } from "@/lib/services/notification.service";
import { toggleFollowService, findFollowersService, findFollowingService } from "@/lib/services/follow.service";

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

describe("findFollowersService / findFollowingService（GATE-22種類B: followedByCurrentUserの付与）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findFollowersService_viewerId未指定_全ユーザーがfollowedByCurrentUser:falseになりfindFollowingIdsAmongは呼ばれない", async () => {
    vi.mocked(findFollowers).mockResolvedValue({
      users: [{ id: "u1", nickname: "たろう", image: null, bio: null }],
      nextCursor: null,
      hasMore: false,
    });

    const result = await findFollowersService({ userId: FOLLOWING_ID });

    expect(result.users).toEqual([{ id: "u1", nickname: "たろう", image: null, bio: null, followedByCurrentUser: false }]);
    expect(findFollowingIdsAmong).not.toHaveBeenCalled();
  });

  it("findFollowersService_viewerId指定_フォロー中のユーザーのみfollowedByCurrentUser:trueになる", async () => {
    vi.mocked(findFollowers).mockResolvedValue({
      users: [
        { id: "u1", nickname: "たろう", image: null, bio: null },
        { id: "u2", nickname: "はなこ", image: null, bio: null },
      ],
      nextCursor: "u2",
      hasMore: true,
    });
    vi.mocked(findFollowingIdsAmong).mockResolvedValue(["u1"]);

    const result = await findFollowersService({ userId: FOLLOWING_ID, viewerId: "viewer-1" });

    expect(findFollowingIdsAmong).toHaveBeenCalledWith("viewer-1", ["u1", "u2"]);
    expect(result.users.find((u) => u.id === "u1")?.followedByCurrentUser).toBe(true);
    expect(result.users.find((u) => u.id === "u2")?.followedByCurrentUser).toBe(false);
    expect(result.nextCursor).toBe("u2");
    expect(result.hasMore).toBe(true);
  });

  it("findFollowingService_cursor/limitがそのままrepositoryへ渡る", async () => {
    vi.mocked(findFollowing).mockResolvedValue({ users: [], nextCursor: null, hasMore: false });

    await findFollowingService({ userId: FOLLOWER_ID, cursor: "user-9", limit: 10 });

    expect(findFollowing).toHaveBeenCalledWith({ userId: FOLLOWER_ID, cursor: "user-9", limit: 10 });
  });
});
