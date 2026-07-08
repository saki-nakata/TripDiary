import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { toggleFollow, isFollowing, countFollowers, countFollowing, findFollowers, findFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("follow.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── toggleFollow ───
  it("toggleFollow_未フォロー状態から呼ぶ_フォローが作成される", async () => {
    const me = await createTestUser("me@example.com", "自分");
    const other = await createTestUser("other@example.com", "他人");

    const result = await toggleFollow(me.id, other.id);

    expect(result).toEqual({ following: true });
    expect(await isFollowing(me.id, other.id)).toBe(true);
  });

  it("toggleFollow_フォロー済み状態から呼ぶ_アンフォローされる", async () => {
    const me = await createTestUser("me2@example.com", "自分2");
    const other = await createTestUser("other2@example.com", "他人2");
    await prisma.follow.create({ data: { followerId: me.id, followingId: other.id } });

    const result = await toggleFollow(me.id, other.id);

    expect(result).toEqual({ following: false });
    expect(await isFollowing(me.id, other.id)).toBe(false);
  });

  // ─── カウント ───
  it("countFollowers_countFollowing_それぞれ正しく集計される", async () => {
    const me = await createTestUser("me3@example.com", "自分3");
    const follower1 = await createTestUser("f1@example.com", "フォロワー1");
    const follower2 = await createTestUser("f2@example.com", "フォロワー2");
    const following1 = await createTestUser("g1@example.com", "フォロー先1");

    await prisma.follow.create({ data: { followerId: follower1.id, followingId: me.id } });
    await prisma.follow.create({ data: { followerId: follower2.id, followingId: me.id } });
    await prisma.follow.create({ data: { followerId: me.id, followingId: following1.id } });

    expect(await countFollowers(me.id)).toBe(2);
    expect(await countFollowing(me.id)).toBe(1);
  });

  // ─── 一覧 ───
  it("findFollowers_findFollowing_ユーザー情報付きで取得できる", async () => {
    const me = await createTestUser("me4@example.com", "自分4");
    const follower = await createTestUser("f3@example.com", "フォロワー3");
    const following = await createTestUser("g2@example.com", "フォロー先2");

    await prisma.follow.create({ data: { followerId: follower.id, followingId: me.id } });
    await prisma.follow.create({ data: { followerId: me.id, followingId: following.id } });

    const followers = await findFollowers(me.id);
    const followingList = await findFollowing(me.id);

    expect(followers.map((u) => u.id)).toEqual([follower.id]);
    expect(followingList.map((u) => u.id)).toEqual([following.id]);
  });

  // ─── findFollowingIdsAmong ───
  it("findFollowingIdsAmong_指定ユーザーのうちフォロー中のIDのみ返す", async () => {
    const me = await createTestUser("me5@example.com", "自分5");
    const followed = await createTestUser("followed@example.com", "フォロー中の人");
    const notFollowed = await createTestUser("notfollowed@example.com", "フォローしていない人");

    await prisma.follow.create({ data: { followerId: me.id, followingId: followed.id } });

    const result = await findFollowingIdsAmong(me.id, [followed.id, notFollowed.id]);

    expect(result).toEqual([followed.id]);
  });

  it("findFollowingIdsAmong_空配列を渡すと空配列を返す(境界値)", async () => {
    const me = await createTestUser("me6@example.com", "自分6");

    expect(await findFollowingIdsAmong(me.id, [])).toEqual([]);
  });
});
