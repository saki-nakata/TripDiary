import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { toggleFollow, isFollowing, findFollowers, findFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";

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

  // ─── 非正規化カウンタ ───
  it("toggleFollow_フォロー時_フォロワー数とフォロー中数が両ユーザーで正しく増減する", async () => {
    const me = await createTestUser("me3@example.com", "自分3");
    const other = await createTestUser("other3@example.com", "他人3");

    await toggleFollow(me.id, other.id);

    const [meAfterFollow, otherAfterFollow] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: me.id } }),
      prisma.user.findUniqueOrThrow({ where: { id: other.id } }),
    ]);
    expect(meAfterFollow.followingCount).toBe(1);
    expect(otherAfterFollow.followerCount).toBe(1);

    await toggleFollow(me.id, other.id);

    const [meAfterUnfollow, otherAfterUnfollow] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: me.id } }),
      prisma.user.findUniqueOrThrow({ where: { id: other.id } }),
    ]);
    expect(meAfterUnfollow.followingCount).toBe(0);
    expect(otherAfterUnfollow.followerCount).toBe(0);
  });

  it("toggleFollow_同じユーザーへ並行してフォローしても全件作成されカウンタが一致する", async () => {
    const target = await createTestUser("follow-concurrent-target@example.com", "フォロー先");
    const followers = await Promise.all(
      Array.from({ length: 12 }, (_, index) => createTestUser(`follow-concurrent-${index}@example.com`, `フォロワー${index}`))
    );

    await Promise.all(followers.map((follower) => toggleFollow(follower.id, target.id)));

    expect(await prisma.follow.count({ where: { followingId: target.id } })).toBe(followers.length);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: target.id } })).followerCount).toBe(followers.length);
    const followerRows = await Promise.all(
      followers.map((follower) => prisma.user.findUniqueOrThrow({ where: { id: follower.id } }))
    );
    expect(followerRows.every((user) => user.followingCount === 1)).toBe(true);
  });

  // ─── 一覧 ───
  it("findFollowers_findFollowing_ユーザー情報付きで取得できる", async () => {
    const me = await createTestUser("me4@example.com", "自分4");
    const follower = await createTestUser("f3@example.com", "フォロワー3");
    const following = await createTestUser("g2@example.com", "フォロー先2");

    await prisma.follow.create({ data: { followerId: follower.id, followingId: me.id } });
    await prisma.follow.create({ data: { followerId: me.id, followingId: following.id } });

    const followers = await findFollowers({ userId: me.id });
    const followingList = await findFollowing({ userId: me.id });

    expect(followers.users.map((u) => u.id)).toEqual([follower.id]);
    expect(followers.hasMore).toBe(false);
    expect(followingList.users.map((u) => u.id)).toEqual([following.id]);
    expect(followingList.hasMore).toBe(false);
  });

  // ─── findFollowers / findFollowing（GATE-22種類B: cursorページング） ───
  it("findFollowers_51件目以降もcursorで継続取得できる", async () => {
    const me = await createTestUser("follow-cursor1@example.com", "自分cursor1");
    const followers = await Promise.all(
      Array.from({ length: 51 }, (_, i) => createTestUser(`follow-cursor-follower${i}@example.com`, `フォロワーcursor${i}`))
    );
    await Promise.all(followers.map((f) => prisma.follow.create({ data: { followerId: f.id, followingId: me.id } })));

    const page1 = await findFollowers({ userId: me.id, limit: 50 });
    expect(page1.users).toHaveLength(50);
    expect(page1.hasMore).toBe(true);

    const page2 = await findFollowers({ userId: me.id, limit: 50, cursor: page1.nextCursor! });
    expect(page2.users).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = new Set([...page1.users, ...page2.users].map((u) => u.id));
    expect(allIds.size).toBe(51);
  });

  it("findFollowers_createdAtが同一のフォロー関係群_followerIdタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("follow-tie1@example.com", "自分tie1");
    const f1 = await createTestUser("follow-tie-f1@example.com", "フォロワーtie1");
    const f2 = await createTestUser("follow-tie-f2@example.com", "フォロワーtie2");
    const f3 = await createTestUser("follow-tie-f3@example.com", "フォロワーtie3");
    await prisma.follow.create({ data: { followerId: f1.id, followingId: me.id } });
    await prisma.follow.create({ data: { followerId: f2.id, followingId: me.id } });
    await prisma.follow.create({ data: { followerId: f3.id, followingId: me.id } });
    const sameCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.follow.updateMany({ where: { followerId: { in: [f1.id, f2.id, f3.id] }, followingId: me.id }, data: { createdAt: sameCreatedAt } });

    const page1 = await findFollowers({ userId: me.id, limit: 2 });
    expect(page1.users).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findFollowers({ userId: me.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.users).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.users, ...page2.users].map((u) => u.id).sort();
    expect(allIds).toEqual([f1.id, f2.id, f3.id].sort());
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
