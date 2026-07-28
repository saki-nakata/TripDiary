import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";

vi.mock("@/lib/repositories/post.repository", () => ({
  findStillReferencedUrls: vi.fn(),
}));
vi.mock("@/lib/repositories/user.repository", () => ({
  findUserById: vi.fn(),
  updateUser: vi.fn(),
  countUserPosts: vi.fn(),
  countVisitedByUser: vi.fn(),
  countLikesReceived: vi.fn(),
  countCommentsReceived: vi.fn(),
  computeTabiScoreInputsForUsers: vi.fn(),
  searchUsersByNickname: vi.fn(),
  findUserPasswordHash: vi.fn(),
  updateUserPassword: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserPasswordHashAndEmail: vi.fn(),
  updateUserEmail: vi.fn(),
}));
vi.mock("@/lib/repositories/follow.repository", () => ({
  isFollowing: vi.fn(),
  findFollowingIdsAmong: vi.fn(),
}));
vi.mock("@node-rs/bcrypt", () => ({
  compare: vi.fn(),
  hash: vi.fn().mockResolvedValue("new-hashed-password"),
}));
vi.mock("@/lib/s3", () => ({
  deleteOwnedObjectsByUrl: vi.fn(),
  isOwnedS3Url: vi.fn(),
}));

import { compare } from "@node-rs/bcrypt";
import { deleteOwnedObjectsByUrl, isOwnedS3Url } from "@/lib/s3";
import { findStillReferencedUrls } from "@/lib/repositories/post.repository";
import {
  findUserById,
  updateUser,
  countUserPosts,
  countVisitedByUser,
  countLikesReceived,
  countCommentsReceived,
  computeTabiScoreInputsForUsers,
  searchUsersByNickname,
  findUserPasswordHash,
  updateUserPassword,
  findUserByEmail,
  findUserPasswordHashAndEmail,
  updateUserEmail,
} from "@/lib/repositories/user.repository";
import { isFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";
import {
  getUserProfileService,
  updateUserService,
  calcTabiScore,
  tabiRank,
  getTabiScoresForUsers,
  searchUsersService,
  changePasswordService,
  changeEmailService,
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
    vi.mocked(isFollowing).mockResolvedValue(false);
  });

  // ─── 存在確認 ───
  it("getUserProfile_ユーザーが存在しない_NotFoundError", async () => {
    vi.mocked(findUserById).mockResolvedValue(null);

    await expect(getUserProfileService(USER_ID)).rejects.toThrow(NotFoundError);
  });

  // ─── email非公開 ───
  it("getUserProfile_レスポンスにemailを含まない", async () => {
    vi.mocked(findUserById).mockResolvedValue({ id: USER_ID, nickname: "たろう", image: null, bio: null, followerCount: 0, followingCount: 0, updatedAt: new Date("2026-01-01T00:00:00.000Z") });

    const profile = await getUserProfileService(USER_ID);

    expect(profile).not.toHaveProperty("email");
  });

  // ─── フォロー状態 ───
  it("getUserProfile_閲覧者IDなし_followedByCurrentUserはfalse", async () => {
    vi.mocked(findUserById).mockResolvedValue({ id: USER_ID, nickname: "たろう", image: null, bio: null, followerCount: 0, followingCount: 0, updatedAt: new Date("2026-01-01T00:00:00.000Z") });

    const profile = await getUserProfileService(USER_ID);

    expect(profile.followedByCurrentUser).toBe(false);
    expect(isFollowing).not.toHaveBeenCalled();
  });

  it("getUserProfile_閲覧者がフォロー中_followedByCurrentUserはtrue", async () => {
    vi.mocked(findUserById).mockResolvedValue({ id: USER_ID, nickname: "たろう", image: null, bio: null, followerCount: 0, followingCount: 0, updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    vi.mocked(isFollowing).mockResolvedValue(true);

    const profile = await getUserProfileService(USER_ID, VIEWER_ID);

    expect(profile.followedByCurrentUser).toBe(true);
    expect(isFollowing).toHaveBeenCalledWith(VIEWER_ID, USER_ID);
  });
});

describe("updateUserService", () => {
  const UPDATED_AT = "2026-01-01T00:00:00.000Z";
  const baseUser = { id: USER_ID, nickname: "たろう", image: null, bio: null, followerCount: 0, followingCount: 0, updatedAt: new Date(UPDATED_AT) };

  function p2025Error() {
    return new Prisma.PrismaClientKnownRequestError("No record found", { code: "P2025", clientVersion: "6.19.3" });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findStillReferencedUrls).mockResolvedValue(new Set());
  });

  // ─── 権限 ───
  it("updateUser_本人以外が編集_ForbiddenErrorかつfindUserById_更新いずれも呼ばれない", async () => {
    await expect(
      updateUserService(USER_ID, VIEWER_ID, { nickname: "たろう", updatedAt: UPDATED_AT })
    ).rejects.toThrow(ForbiddenError);
    expect(findUserById).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  // ─── 存在確認 ───
  it("updateUser_findUserByIdがnull_NotFoundErrorかつ更新は呼ばれない", async () => {
    vi.mocked(findUserById).mockResolvedValue(null);

    await expect(
      updateUserService(USER_ID, USER_ID, { nickname: "たろう", updatedAt: UPDATED_AT })
    ).rejects.toThrow(NotFoundError);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updateUser_本人が編集_更新される", async () => {
    vi.mocked(findUserById).mockResolvedValue(baseUser);
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう2", bio: null, image: null });

    const result = await updateUserService(USER_ID, USER_ID, { nickname: "たろう2", updatedAt: UPDATED_AT });

    expect(result.nickname).toBe("たろう2");
    expect(updateUser).toHaveBeenCalledWith(USER_ID, { nickname: "たろう2" }, new Date(UPDATED_AT));
  });

  // ─── 楽観ロック ───
  it("updateUser_他の変更と競合(P2025)_ConflictError", async () => {
    vi.mocked(findUserById).mockResolvedValue(baseUser);
    vi.mocked(updateUser).mockRejectedValue(p2025Error());

    await expect(
      updateUserService(USER_ID, USER_ID, { nickname: "たろう2", updatedAt: UPDATED_AT })
    ).rejects.toThrow(ConflictError);
  });

  it("updateUser_他の変更と競合(P2025)_S3削除は呼ばれない", async () => {
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, image: "https://bucket/uploads/user-1/old.jpg" });
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updateUser).mockRejectedValue(p2025Error());

    await expect(
      updateUserService(USER_ID, USER_ID, {
        nickname: "たろう",
        image: "https://bucket/uploads/user-1/new.jpg",
        updatedAt: UPDATED_AT,
      })
    ).rejects.toThrow(ConflictError);
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  // ─── 書き込み時URL所有権検証 ───
  it("updateUser_own-prefix外かつbefore.imageとも異なるURL_ValidationErrorかつ更新は呼ばれない", async () => {
    vi.mocked(findUserById).mockResolvedValue(baseUser);
    vi.mocked(isOwnedS3Url).mockReturnValue(false);

    await expect(
      updateUserService(USER_ID, USER_ID, {
        nickname: "たろう",
        image: "https://bucket/uploads/other-user/a.jpg",
        updatedAt: UPDATED_AT,
      })
    ).rejects.toThrow(ValidationError);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("updateUser_own-prefixのURL_許可される", async () => {
    vi.mocked(findUserById).mockResolvedValue(baseUser);
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう", bio: null, image: "https://bucket/uploads/user-1/a.jpg" });

    await updateUserService(USER_ID, USER_ID, {
      nickname: "たろう",
      image: "https://bucket/uploads/user-1/a.jpg",
      updatedAt: UPDATED_AT,
    });

    expect(updateUser).toHaveBeenCalled();
  });

  // ─── アバターのS3クリーンアップ（undefined/null/差分の区別・DB操作優先） ───
  it("updateUser_imageがundefined_書き込み検証もS3削除も実行されない", async () => {
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, image: "https://bucket/uploads/user-1/old.jpg" });
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう2", bio: null, image: "https://bucket/uploads/user-1/old.jpg" });

    await updateUserService(USER_ID, USER_ID, { nickname: "たろう2", updatedAt: UPDATED_AT });

    expect(isOwnedS3Url).not.toHaveBeenCalled();
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  it("updateUser_旧imageと新imageが同一(未変更)_S3削除は呼ばれない", async () => {
    const sameUrl = "https://bucket/uploads/user-1/a.jpg";
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, image: sameUrl });
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう", bio: null, image: sameUrl });

    await updateUserService(USER_ID, USER_ID, { nickname: "たろう", image: sameUrl, updatedAt: UPDATED_AT });

    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  it("updateUser_旧imageがnull(元々未設定)_S3削除は呼ばれない", async () => {
    vi.mocked(findUserById).mockResolvedValue(baseUser);
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう", bio: null, image: "https://bucket/uploads/user-1/a.jpg" });

    await updateUserService(USER_ID, USER_ID, {
      nickname: "たろう",
      image: "https://bucket/uploads/user-1/a.jpg",
      updatedAt: UPDATED_AT,
    });

    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  it("updateUser_旧image≠新image_deleteOwnedObjectsByUrlが所有者ID付きで呼ばれる", async () => {
    const oldUrl = "https://bucket/uploads/user-1/old.jpg";
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, image: oldUrl });
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう", bio: null, image: "https://bucket/uploads/user-1/new.jpg" });

    await updateUserService(USER_ID, USER_ID, {
      nickname: "たろう",
      image: "https://bucket/uploads/user-1/new.jpg",
      updatedAt: UPDATED_AT,
    });

    expect(findStillReferencedUrls).toHaveBeenCalledWith([oldUrl]);
    expect(deleteOwnedObjectsByUrl).toHaveBeenCalledWith([oldUrl], USER_ID);
  });

  it("updateUser_imageをnullに変更(アバター削除)_旧imageがS3削除される", async () => {
    const oldUrl = "https://bucket/uploads/user-1/old.jpg";
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, image: oldUrl });
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう", bio: null, image: null });

    await updateUserService(USER_ID, USER_ID, { nickname: "たろう", image: null, updatedAt: UPDATED_AT });

    expect(deleteOwnedObjectsByUrl).toHaveBeenCalledWith([oldUrl], USER_ID);
  });

  it("updateUserRepoが失敗_deleteOwnedObjectsByUrlは呼ばれない", async () => {
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, image: "https://bucket/uploads/user-1/old.jpg" });
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updateUser).mockRejectedValue(new Error("db error"));

    await expect(
      updateUserService(USER_ID, USER_ID, {
        nickname: "たろう",
        image: "https://bucket/uploads/user-1/new.jpg",
        updatedAt: UPDATED_AT,
      })
    ).rejects.toThrow("db error");
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  // ─── 共有URL（他の投稿・別ユーザーからまだ参照されている場合は削除しない） ───
  it("updateUser_旧imageが他の投稿からまだ参照されている_deleteOwnedObjectsByUrlは呼ばれない", async () => {
    const sharedUrl = "https://bucket/uploads/user-1/shared.jpg";
    vi.mocked(findUserById).mockResolvedValue({ ...baseUser, image: sharedUrl });
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updateUser).mockResolvedValue({ id: USER_ID, nickname: "たろう", bio: null, image: "https://bucket/uploads/user-1/new.jpg" });
    vi.mocked(findStillReferencedUrls).mockResolvedValue(new Set([sharedUrl]));

    await updateUserService(USER_ID, USER_ID, {
      nickname: "たろう",
      image: "https://bucket/uploads/user-1/new.jpg",
      updatedAt: UPDATED_AT,
    });

    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
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

describe("changePasswordService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── changePassword ───
  it("changePassword_他人のIDを指定_ForbiddenErrorかつrepositoryは呼ばれない", async () => {
    await expect(
      changePasswordService(USER_ID, VIEWER_ID, "current-pw", "new-password")
    ).rejects.toThrow(ForbiddenError);
    expect(findUserPasswordHash).not.toHaveBeenCalled();
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it("changePassword_存在しないユーザー_NotFoundError", async () => {
    vi.mocked(findUserPasswordHash).mockResolvedValue(null);

    await expect(
      changePasswordService(USER_ID, USER_ID, "current-pw", "new-password")
    ).rejects.toThrow(NotFoundError);
  });

  it("changePassword_現在のパスワードが誤り_ValidationErrorかつrepository更新は呼ばれない", async () => {
    vi.mocked(findUserPasswordHash).mockResolvedValue({ password: "hashed-current", isProtected: false });
    vi.mocked(compare).mockResolvedValue(false as never);

    await expect(
      changePasswordService(USER_ID, USER_ID, "wrong-current-pw", "new-password")
    ).rejects.toThrow(ValidationError);
    expect(updateUserPassword).not.toHaveBeenCalled();
  });

  it("changePassword_現在のパスワードが正しい_ハッシュ化した新パスワードで更新される", async () => {
    vi.mocked(findUserPasswordHash).mockResolvedValue({ password: "hashed-current", isProtected: false });
    vi.mocked(compare).mockResolvedValue(true as never);

    await changePasswordService(USER_ID, USER_ID, "current-pw", "new-password");

    expect(updateUserPassword).toHaveBeenCalledWith(USER_ID, "new-hashed-password");
  });

  it("changePassword_確認用アカウント_ForbiddenErrorかつパスワード照合・更新は呼ばれない", async () => {
    vi.mocked(findUserPasswordHash).mockResolvedValue({ password: "hashed-current", isProtected: true });

    const promise = changePasswordService(USER_ID, USER_ID, "current-pw", "new-password");
    await expect(promise).rejects.toThrow(ForbiddenError);
    await expect(promise).rejects.toThrow("確認用アカウントのため変更できません");
    expect(compare).not.toHaveBeenCalled();
    expect(updateUserPassword).not.toHaveBeenCalled();
  });
});

describe("changeEmailService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── changeEmail ───
  it("changeEmail_他人のIDを指定_ForbiddenErrorかつrepositoryは呼ばれない", async () => {
    await expect(
      changeEmailService(USER_ID, VIEWER_ID, "new@example.com", "current-pw")
    ).rejects.toThrow(ForbiddenError);
    expect(findUserPasswordHashAndEmail).not.toHaveBeenCalled();
    expect(updateUserEmail).not.toHaveBeenCalled();
  });

  it("changeEmail_存在しないユーザー_NotFoundError", async () => {
    vi.mocked(findUserPasswordHashAndEmail).mockResolvedValue(null);

    await expect(
      changeEmailService(USER_ID, USER_ID, "new@example.com", "current-pw")
    ).rejects.toThrow(NotFoundError);
  });

  it("changeEmail_現在のパスワードが誤り_ValidationErrorかつrepository更新は呼ばれない", async () => {
    vi.mocked(findUserPasswordHashAndEmail).mockResolvedValue({ password: "hashed-current", email: "old@example.com", isProtected: false });
    vi.mocked(compare).mockResolvedValue(false as never);

    await expect(
      changeEmailService(USER_ID, USER_ID, "new@example.com", "wrong-pw")
    ).rejects.toThrow(ValidationError);
    expect(updateUserEmail).not.toHaveBeenCalled();
  });

  it("changeEmail_新しいメールアドレスが既存ユーザーと重複_ConflictError", async () => {
    vi.mocked(findUserPasswordHashAndEmail).mockResolvedValue({ password: "hashed-current", email: "old@example.com", isProtected: false });
    vi.mocked(compare).mockResolvedValue(true as never);
    vi.mocked(findUserByEmail).mockResolvedValue({ id: "other-user" } as never);

    await expect(
      changeEmailService(USER_ID, USER_ID, "taken@example.com", "current-pw")
    ).rejects.toThrow(ConflictError);
    expect(updateUserEmail).not.toHaveBeenCalled();
  });

  it("changeEmail_現在と同じメールアドレスを指定_重複チェックをスキップし何もしない(境界値)", async () => {
    vi.mocked(findUserPasswordHashAndEmail).mockResolvedValue({ password: "hashed-current", email: "same@example.com", isProtected: false });
    vi.mocked(compare).mockResolvedValue(true as never);

    await changeEmailService(USER_ID, USER_ID, "same@example.com", "current-pw");

    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(updateUserEmail).not.toHaveBeenCalled();
  });

  it("changeEmail_正常なリクエスト_新しいメールアドレスで更新される", async () => {
    vi.mocked(findUserPasswordHashAndEmail).mockResolvedValue({ password: "hashed-current", email: "old@example.com", isProtected: false });
    vi.mocked(compare).mockResolvedValue(true as never);
    vi.mocked(findUserByEmail).mockResolvedValue(null);

    await changeEmailService(USER_ID, USER_ID, "new@example.com", "current-pw");

    expect(updateUserEmail).toHaveBeenCalledWith(USER_ID, "new@example.com");
  });

  it("changeEmail_確認用アカウント_ForbiddenErrorかつパスワード照合・更新は呼ばれない", async () => {
    vi.mocked(findUserPasswordHashAndEmail).mockResolvedValue({
      password: "hashed-current",
      email: "old@example.com",
      isProtected: true,
    });

    const promise = changeEmailService(USER_ID, USER_ID, "new@example.com", "current-pw");
    await expect(promise).rejects.toThrow(ForbiddenError);
    await expect(promise).rejects.toThrow("確認用アカウントのため変更できません");
    expect(compare).not.toHaveBeenCalled();
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(updateUserEmail).not.toHaveBeenCalled();
  });
});
