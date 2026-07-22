import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { toggleLike } from "@/lib/repositories/like.repository";
import { createPost } from "@/lib/repositories/post.repository";

// P2002（同時いいねの一意制約競合）分岐は実DBの単体テストでは再現が困難なため対象外とする。
// パフォーマンステスト（Phase 5-B）のStress/Spikeシナリオが並行いいねトグルを大量に発生させるため、
// この分岐の実質的なカバーはそちらに委ねる。

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("like.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── toggleLike ───
  it("toggleLike_未いいね状態から呼ぶ_いいねされてlikeCountが+1になる", async () => {
    const user = await createTestUser("l1@example.com", "ユーザー1");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await toggleLike(user.id, post.id);

    expect(result).toEqual({ liked: true });
    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.likeCount).toBe(1);
  });

  it("toggleLike_いいね済み状態から呼ぶ_解除されてlikeCountが-1になる", async () => {
    const user = await createTestUser("l2@example.com", "ユーザー2");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await toggleLike(user.id, post.id);

    const result = await toggleLike(user.id, post.id);

    expect(result).toEqual({ liked: false });
    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.likeCount).toBe(0);
  });

  it("toggleLike_2回連続で呼ぶ_トグルが往復してlikeCountが0に戻る(境界値)", async () => {
    const user = await createTestUser("l3@example.com", "ユーザー3");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    await toggleLike(user.id, post.id);
    await toggleLike(user.id, post.id);

    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.likeCount).toBe(0);
  });

  it("toggleLike_異なる2ユーザーが同じ投稿にいいね_likeCountが2になる", async () => {
    const owner = await createTestUser("l4@example.com", "投稿者");
    const userA = await createTestUser("l5@example.com", "ユーザーA");
    const userB = await createTestUser("l6@example.com", "ユーザーB");
    const post = await createPost(owner.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    await toggleLike(userA.id, post.id);
    await toggleLike(userB.id, post.id);

    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.likeCount).toBe(2);
  });

  it("toggleLike_同じ投稿へ並行していいねしても全件作成されlikeCountが一致する", async () => {
    const owner = await createTestUser("l-concurrent-owner@example.com", "投稿者");
    const post = await createPost(owner.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const users = await Promise.all(
      Array.from({ length: 12 }, (_, index) => createTestUser(`l-concurrent-${index}@example.com`, `ユーザー${index}`))
    );

    await Promise.all(users.map((user) => toggleLike(user.id, post.id)));

    expect(await prisma.like.count({ where: { postId: post.id } })).toBe(users.length);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).likeCount).toBe(users.length);
  });
});
