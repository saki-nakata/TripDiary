import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { findFollowingPosts, findLocationCounts, createPost } from "@/lib/repositories/post.repository";

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.postImage.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.visited.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("post.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── findFollowingPosts ───
  it("findFollowingPosts_フォロー中ユーザーと自分の投稿のみ取得される", async () => {
    const me = await createTestUser("me@example.com", "自分");
    const following = await createTestUser("following@example.com", "フォロー中");
    const stranger = await createTestUser("stranger@example.com", "他人");

    await prisma.follow.create({ data: { followerId: me.id, followingId: following.id } });

    await createPost(me.id, {
      title: "自分の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01",
    });
    await createPost(following.id, {
      title: "フォロー中の投稿", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-02",
    });
    await createPost(stranger.id, {
      title: "他人の投稿", body: "本文", location: "京都府", category: "観光", visitedAt: "2026-01-03",
    });

    const result = await findFollowingPosts({ userId: me.id });

    expect(result.posts).toHaveLength(2);
    const titles = result.posts.map((p) => p.title).sort();
    expect(titles).toEqual(["フォロー中の投稿", "自分の投稿"].sort());
  });

  it("findFollowingPosts_フォロー中の投稿が新着順で並ぶ", async () => {
    const me = await createTestUser("me2@example.com", "自分2");
    await createPost(me.id, { title: "古い投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "新しい投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });

    const result = await findFollowingPosts({ userId: me.id });

    expect(result.posts[0].title).toBe("新しい投稿");
    expect(result.posts[1].title).toBe("古い投稿");
  });

  // ─── findLocationCounts ───
  it("findLocationCounts_エリアごとの投稿件数が集計される", async () => {
    const me = await createTestUser("me3@example.com", "自分3");
    await createPost(me.id, { title: "投稿A", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "投稿B", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });
    await createPost(me.id, { title: "投稿C", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-03" });

    const counts = await findLocationCounts();
    const tokyo = counts.find((c) => c.location === "東京都");
    const osaka = counts.find((c) => c.location === "大阪府");

    expect(tokyo?.count).toBe(2);
    expect(osaka?.count).toBe(1);
  });
});
