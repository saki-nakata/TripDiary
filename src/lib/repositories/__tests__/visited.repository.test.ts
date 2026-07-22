import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { toggleVisited } from "@/lib/repositories/visited.repository";
import { createPost } from "@/lib/repositories/post.repository";

// createPost() は投稿者自身の投稿を自動的に訪問済みにする（post.repository.ts参照）ため、
// トグル対象のユーザーは投稿者とは別のユーザーにする（自動生成分と混同しないため）。

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.visited.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("visited.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── toggleVisited ───
  it("toggleVisited_未登録状態から呼ぶ_登録される", async () => {
    const owner = await createTestUser("v1-owner@example.com", "投稿者1");
    const visitor = await createTestUser("v1@example.com", "ユーザー1");
    const post = await createPost(owner.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await toggleVisited(visitor.id, post.id);

    expect(result).toEqual({ visited: true });
  });

  it("toggleVisited_登録済み状態から呼ぶ_解除される", async () => {
    const owner = await createTestUser("v2-owner@example.com", "投稿者2");
    const visitor = await createTestUser("v2@example.com", "ユーザー2");
    const post = await createPost(owner.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await prisma.visited.create({ data: { userId: visitor.id, postId: post.id } });

    const result = await toggleVisited(visitor.id, post.id);

    expect(result).toEqual({ visited: false });
  });

  it("toggleVisited_2回連続で呼ぶ_トグルが往復してレコードが残らない(境界値)", async () => {
    const owner = await createTestUser("v3-owner@example.com", "投稿者3");
    const visitor = await createTestUser("v3@example.com", "ユーザー3");
    const post = await createPost(owner.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    await toggleVisited(visitor.id, post.id);
    await toggleVisited(visitor.id, post.id);

    const count = await prisma.visited.count({ where: { userId: visitor.id, postId: post.id } });
    expect(count).toBe(0);
  });
});
