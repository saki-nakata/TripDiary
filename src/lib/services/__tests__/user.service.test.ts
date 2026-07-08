import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

vi.mock("@/lib/repositories/user.repository", () => ({
  findUserById: vi.fn(),
  updateUser: vi.fn(),
  countUserPosts: vi.fn(),
  countVisitedByUser: vi.fn(),
  countLikesReceived: vi.fn(),
  countCommentsReceived: vi.fn(),
  computeTabiScoreInputsForUsers: vi.fn(),
  searchUsersByNickname: vi.fn(),
}));
vi.mock("@/lib/repositories/follow.repository", () => ({
  countFollowers: vi.fn(),
  countFollowing: vi.fn(),
  isFollowing: vi.fn(),
  findFollowingIdsAmong: vi.fn(),
}));

import {
  findUserById,
  updateUser,
  countUserPosts,
  countVisitedByUser,
  countLikesReceived,
  countCommentsReceived,
  computeTabiScoreInputsForUsers,
  searchUsersByNickname,
} from "@/lib/repositories/user.repository";
import { countFollowers, countFollowing, isFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";
import {
  getUserProfileService,
  updateUserService,
  calcTabiScore,
  tabiRank,
  getTabiScoresForUsers,
  searchUsersService,
} from "@/lib/services/user.service";

const USER_ID = "user-1";
const VIEWER_ID = "user-2";

describe("getUserProfileService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(countUserPosts).mockResolvedValue(0);
    vi.mocked(countVisitedByUser).mockResolvedValue(0);
    vi.mocked(countLikesReceived).mockResolvedValue(0);
    vi.mocked(countCommentsReceived).mockResolvedValue(0);
    vi.mocked(countFollowers).mockResolvedValue(0);
    vi.mocked(countFollowing).mockResolvedValue(0);
    vi.mocked(isFollowing).mockResolvedValue(false);
  });

  // ─── 存在確認 ───
  it("getUserProfile_ユーザーが存在しない_NotFoundError", async () => {
    vi.mocked(findUserById).mockResolvedValue(null);

    await expect(getUserProfileService(USER_ID)).rejects.toThrow(NotFoundError);
  });

  // ─── email非公開 ───
  it("getUserProfile_レスポンスにemailを含まない", async () => {
    vi.mocked(findUserById).mockResolvedValue({ id: USER_ID, nickname: "たろう", image: null, bio: null });

    const profile = await getUserProfileService(USER_ID);

    expect(profile).not.toHaveProperty("email");
  });

  // ─── フォロー状態 ───
  it("getUserProfile_閲覧者IDなし_followedByCurrentUserはfalse", async () => {
    vi.mocked(findUserById).mockResolvedValue({ id: USER_ID, nickname: "たろう", image: null, bio: null });

    const profile = await getUserProfileService(USER_ID);

    expect(profile.followedByCurrentUser).toBe(false);
    expect(isFollowing).not.toHaveBeenCalled();
  });

  it("getUserProfile_閲覧者がフォロー中_followedByCurrentUserはtrue", async () => {
    vi.mocked(findUserById).mockResolvedValue({ id: USER_ID, nickname: "たろう", image: null, bio: null });
    vi.mocked(isFollowing).mockResolvedValue(true);

    const profile = await getUserProfileService(USER_ID, VIEWER_ID);

    expect(profile.followedByCurrentUser).toBe(true);
    expect(isFollowing).toHaveBeenCalledWith(VIEWER_ID, USER_ID);
  });
});

describe("updateUserService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── 権限 ───
  it("updateUser_本人以外が編集_ForbiddenErrorかつ更新は呼ばれない", async () => {
    await expect(
      updateUserService(USER_ID, VIEWER_ID, { nickname: "たろう" })
    ).rejects.toThrow(ForbiddenError);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updateUser_本人が編集_更新される", async () => {
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう2", bio: null, image: null });

    const result = await updateUserService(USER_ID, USER_ID, { nickname: "たろう2" });

    expect(result.nickname).toBe("たろう2");
    expect(updateUser).toHaveBeenCalledWith(USER_ID, { nickname: "たろう2" });
  });
});

describe("calcTabiScore / tabiRank", () => {
  // ─── 計算式（境界値ペア） ───
  it("calcTabiScore_投稿数10訪問済み0いいね0コメント0_100", () => {
    expect(calcTabiScore({ postCount: 10, visitedCount: 0, likesReceived: 0, commentsReceived: 0 })).toBe(100);
  });

  it("tabiRank_スコア99_ゴールドトラベラー", () => {
    expect(tabiRank(99)).toBe("ゴールドトラベラー");
  });

  it("tabiRank_スコア100_プラチナトラベラー", () => {
    expect(tabiRank(100)).toBe("プラチナトラベラー");
  });

  it("tabiRank_スコア0_ブロンズトラベラー", () => {
    expect(tabiRank(0)).toBe("ブロンズトラベラー");
  });
});

describe("getTabiScoresForUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("複数ユーザーの集計結果からスコア・ランクをそれぞれ算出する", async () => {
    vi.mocked(computeTabiScoreInputsForUsers).mockResolvedValue(
      new Map([
        ["user-a", { postCount: 10, visitedCount: 0, likesReceived: 0, commentsReceived: 0 }],
        ["user-b", { postCount: 0, visitedCount: 0, likesReceived: 0, commentsReceived: 0 }],
      ])
    );

    const result = await getTabiScoresForUsers(["user-a", "user-b"]);

    expect(result.get("user-a")).toEqual({ score: 100, rank: "プラチナトラベラー" });
    expect(result.get("user-b")).toEqual({ score: 0, rank: "ブロンズトラベラー" });
    expect(computeTabiScoreInputsForUsers).toHaveBeenCalledWith(["user-a", "user-b"]);
  });
});

describe("searchUsersService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(computeTabiScoreInputsForUsers).mockResolvedValue(new Map());
  });

  it("qパラメータなし_excludeUserIdなしで検索される", async () => {
    vi.mocked(searchUsersByNickname).mockResolvedValue({ users: [], nextCursor: null, hasMore: false });

    await searchUsersService({ q: "", limit: 20 });

    expect(searchUsersByNickname).toHaveBeenCalledWith({
      q: "",
      cursor: undefined,
      limit: 20,
      excludeUserId: undefined,
    });
  });

  it("viewerId指定_excludeUserIdとして渡される", async () => {
    vi.mocked(searchUsersByNickname).mockResolvedValue({ users: [], nextCursor: null, hasMore: false });

    await searchUsersService({ q: "", limit: 20, viewerId: "viewer-1" });

    expect(searchUsersByNickname).toHaveBeenCalledWith({
      q: "",
      cursor: undefined,
      limit: 20,
      excludeUserId: "viewer-1",
    });
  });

  it("viewerIdなし_followedByCurrentUserは全てfalseかつfindFollowingIdsAmongは呼ばれない", async () => {
    vi.mocked(searchUsersByNickname).mockResolvedValue({
      users: [{ id: "u1", nickname: "たろう", image: null, bio: null, _count: { posts: 1, followers: 0 } }],
      nextCursor: null,
      hasMore: false,
    });

    const result = await searchUsersService({ q: "たろう", limit: 20 });

    expect(result.users[0].followedByCurrentUser).toBe(false);
    expect(findFollowingIdsAmong).not.toHaveBeenCalled();
  });

  it("viewerIdあり_フォロー中のユーザーはfollowedByCurrentUserがtrue", async () => {
    vi.mocked(searchUsersByNickname).mockResolvedValue({
      users: [
        { id: "u1", nickname: "たろう", image: null, bio: null, _count: { posts: 1, followers: 0 } },
        { id: "u2", nickname: "はなこ", image: null, bio: null, _count: { posts: 0, followers: 0 } },
      ],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(findFollowingIdsAmong).mockResolvedValue(["u1"]);

    const result = await searchUsersService({ q: "た", limit: 20, viewerId: "viewer-1" });

    expect(findFollowingIdsAmong).toHaveBeenCalledWith("viewer-1", ["u1", "u2"]);
    expect(result.users.find((u) => u.id === "u1")?.followedByCurrentUser).toBe(true);
    expect(result.users.find((u) => u.id === "u2")?.followedByCurrentUser).toBe(false);
  });

  it("各ユーザーにtabiScore_tabiRankが付与される", async () => {
    vi.mocked(searchUsersByNickname).mockResolvedValue({
      users: [
        { id: "u1", nickname: "たろう", image: null, bio: null, _count: { posts: 1, followers: 0 } },
        { id: "u2", nickname: "はなこ", image: null, bio: null, _count: { posts: 0, followers: 0 } },
      ],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(computeTabiScoreInputsForUsers).mockResolvedValue(
      new Map([["u1", { postCount: 10, visitedCount: 0, likesReceived: 0, commentsReceived: 0 }]])
    );

    const result = await searchUsersService({ q: "た", limit: 20 });

    expect(result.users.find((u) => u.id === "u1")).toMatchObject({
      tabiScore: 100,
      tabiRank: "プラチナトラベラー",
    });
    expect(result.users.find((u) => u.id === "u2")).toMatchObject({
      tabiScore: 0,
      tabiRank: "ブロンズトラベラー",
    });
  });

  it("tabiScoreの降順で返す", async () => {
    vi.mocked(searchUsersByNickname).mockResolvedValue({
      users: [
        { id: "u1", nickname: "たろう", image: null, bio: null, _count: { posts: 1, followers: 0 } },
        { id: "u2", nickname: "はなこ", image: null, bio: null, _count: { posts: 0, followers: 0 } },
        { id: "u3", nickname: "じろう", image: null, bio: null, _count: { posts: 0, followers: 0 } },
      ],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(computeTabiScoreInputsForUsers).mockResolvedValue(
      new Map([
        ["u1", { postCount: 1, visitedCount: 0, likesReceived: 0, commentsReceived: 0 }],
        ["u2", { postCount: 10, visitedCount: 0, likesReceived: 0, commentsReceived: 0 }],
        ["u3", { postCount: 5, visitedCount: 0, likesReceived: 0, commentsReceived: 0 }],
      ])
    );

    const result = await searchUsersService({ q: "", limit: 20 });

    expect(result.users.map((u) => u.id)).toEqual(["u2", "u3", "u1"]);
  });
});
