import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { toggleWishlist, countWishlistByUser } from "@/lib/repositories/wishlist.repository";
import { createPost } from "@/lib/repositories/post.repository";

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.wishlist.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("wishlist.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── toggleWishlist ───
  it("toggleWishlist_未登録状態から呼ぶ_登録される", async () => {
    const user = await createTestUser("w1@example.com", "ユーザー1");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await toggleWishlist(user.id, post.id);

    expect(result).toEqual({ wishlisted: true });
  });

  it("toggleWishlist_登録済み状態から呼ぶ_解除される", async () => {
    const user = await createTestUser("w2@example.com", "ユーザー2");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await prisma.wishlist.create({ data: { userId: user.id, postId: post.id } });

    const result = await toggleWishlist(user.id, post.id);

    expect(result).toEqual({ wishlisted: false });
  });

  // ─── countWishlistByUser ───
  it("countWishlistByUser_登録件数が正しく集計される", async () => {
    const user = await createTestUser("w3@example.com", "ユーザー3");
    const post1 = await createPost(user.id, { title: "投稿1", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const post2 = await createPost(user.id, { title: "投稿2", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });
    await prisma.wishlist.create({ data: { userId: user.id, postId: post1.id } });
    await prisma.wishlist.create({ data: { userId: user.id, postId: post2.id } });

    expect(await countWishlistByUser(user.id)).toBe(2);
  });

  it("countWishlistByUser_登録なし_0を返す(境界値)", async () => {
    const user = await createTestUser("w4@example.com", "ユーザー4");

    expect(await countWishlistByUser(user.id)).toBe(0);
  });
});
