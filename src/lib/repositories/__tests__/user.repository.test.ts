import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  searchUsersByNickname,
  findUserById,
  updateUser,
  countUserPosts,
  countVisitedByUser,
  countLikesReceived,
  countCommentsReceived,
  countCommentsByAuthor,
  findCommentsByAuthor,
  findCommentsReceivedByAuthor,
  computeTabiScoreInputsForUsers,
} from "@/lib/repositories/user.repository";
import { createPost } from "@/lib/repositories/post.repository";

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.visited.deleteMany();
  await prisma.post.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("user.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── searchUsersByNickname ───
  it("searchUsersByNickname_部分一致するユーザーのみ取得される", async () => {
    await createTestUser("taro@example.com", "たろう");
    await createTestUser("hanako@example.com", "はなこ");

    const result = await searchUsersByNickname({ q: "たろ" });

    expect(result.users).toHaveLength(1);
    expect(result.users[0].nickname).toBe("たろう");
  });

  it("searchUsersByNickname_一致なし_空配列", async () => {
    await createTestUser("taro2@example.com", "たろう2");

    const result = await searchUsersByNickname({ q: "存在しない名前" });

    expect(result.users).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("searchUsersByNickname_limitを超える件数_hasMoreがtrueになる(境界値)", async () => {
    for (let i = 0; i < 3; i++) {
      await createTestUser(`user${i}@example.com`, `検索太郎${i}`);
    }

    const result = await searchUsersByNickname({ q: "検索太郎", limit: 2 });

    expect(result.users).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it("searchUsersByNickname_qが空文字_全ユーザーを取得する(境界値)", async () => {
    await createTestUser("all1@example.com", "全件対象1");
    await createTestUser("all2@example.com", "全件対象2");

    const result = await searchUsersByNickname({ q: "" });

    expect(result.users).toHaveLength(2);
  });

  it("searchUsersByNickname_excludeUserIdを指定_自分自身を除外する", async () => {
    const self = await createTestUser("self@example.com", "自分自身");
    await createTestUser("other10@example.com", "他人10");

    const result = await searchUsersByNickname({ q: "", excludeUserId: self.id });

    expect(result.users).toHaveLength(1);
    expect(result.users.find((u) => u.id === self.id)).toBeUndefined();
  });

  // ─── findUserById / updateUser ───
  it("findUserById_存在するID_ユーザー情報を返す(emailを含まない)", async () => {
    const user = await createTestUser("find@example.com", "検索対象");

    const found = await findUserById(user.id);

    expect(found?.nickname).toBe("検索対象");
    expect(found).not.toHaveProperty("email");
  });

  it("findUserById_存在しないID_nullを返す", async () => {
    expect(await findUserById("nonexistent-id")).toBeNull();
  });

  it("updateUser_nickname_bio_imageが更新される", async () => {
    const user = await createTestUser("update@example.com", "更新前");

    const updated = await updateUser(user.id, { nickname: "更新後", bio: "自己紹介", image: "/uploads/a.jpg" });

    expect(updated).toEqual({ id: user.id, nickname: "更新後", bio: "自己紹介", image: "/uploads/a.jpg" });
  });

  // ─── カウント系 ───
  it("countUserPosts_countVisitedByUser_countLikesReceived_countCommentsReceived_それぞれ正しく集計される", async () => {
    const author = await createTestUser("author@example.com", "投稿者");
    const other = await createTestUser("other5@example.com", "他人5");
    const post = await createPost(author.id, {
      title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01",
    });
    await createPost(author.id, {
      title: "投稿2", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02",
    });
    await prisma.visited.create({ data: { userId: author.id, postId: post.id } });
    await prisma.like.create({ data: { userId: other.id, postId: post.id } });
    await prisma.comment.create({ data: { authorId: other.id, postId: post.id, body: "コメント" } });

    expect(await countUserPosts(author.id)).toBe(2);
    expect(await countVisitedByUser(author.id)).toBe(1);
    expect(await countLikesReceived(author.id)).toBe(1);
    expect(await countCommentsReceived(author.id)).toBe(1);
  });

  // ─── コメント一覧 ───
  it("findCommentsByAuthor_findCommentsReceivedByAuthor_それぞれ正しいコメントを返す", async () => {
    const author = await createTestUser("author2@example.com", "投稿者2");
    const commenter = await createTestUser("commenter@example.com", "コメント投稿者");
    const post = await createPost(author.id, {
      title: "投稿3", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01",
      imageUrls: ["/uploads/post3.jpg"],
    });
    await prisma.comment.create({ data: { authorId: commenter.id, postId: post.id, body: "投稿者への感想" } });

    const written = await findCommentsByAuthor(commenter.id);
    const received = await findCommentsReceivedByAuthor(author.id);

    expect(written).toHaveLength(1);
    expect(written[0].body).toBe("投稿者への感想");
    expect(written[0].post.images).toEqual([{ url: "/uploads/post3.jpg" }]);
    expect(written[0].post.author.id).toBe(author.id);
    expect(received).toHaveLength(1);
    expect(received[0].author.id).toBe(commenter.id);
    expect(received[0].post.images).toEqual([{ url: "/uploads/post3.jpg" }]);
  });

  // ─── countCommentsByAuthor ───
  it("countCommentsByAuthor_自分が投稿したコメント数を返す", async () => {
    const author = await createTestUser("author3@example.com", "投稿者3");
    const commenter = await createTestUser("commenter2@example.com", "コメント投稿者2");
    const post = await createPost(author.id, {
      title: "投稿4", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01",
    });
    await prisma.comment.create({ data: { authorId: commenter.id, postId: post.id, body: "コメント1" } });
    await prisma.comment.create({ data: { authorId: commenter.id, postId: post.id, body: "コメント2" } });

    expect(await countCommentsByAuthor(commenter.id)).toBe(2);
    expect(await countCommentsByAuthor(author.id)).toBe(0);
  });

  // ─── computeTabiScoreInputsForUsers ───
  it("computeTabiScoreInputsForUsers_複数ユーザーの投稿/訪問済み/被いいね/被コメントをバッチ集計する", async () => {
    const active = await createTestUser("active@example.com", "アクティブ");
    const idle = await createTestUser("idle@example.com", "無活動");
    const other = await createTestUser("otherX@example.com", "その他");

    const post = await createPost(active.id, {
      title: "投稿5", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01",
    });
    await createPost(active.id, {
      title: "投稿6", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02",
    });
    await prisma.visited.create({ data: { userId: active.id, postId: post.id } });
    await prisma.like.create({ data: { userId: other.id, postId: post.id } });
    await prisma.comment.create({ data: { authorId: other.id, postId: post.id, body: "いいね" } });

    const result = await computeTabiScoreInputsForUsers([active.id, idle.id]);

    expect(result.get(active.id)).toEqual({
      postCount: 2,
      visitedCount: 1,
      likesReceived: 1,
      commentsReceived: 1,
    });
    expect(result.get(idle.id)).toEqual({
      postCount: 0,
      visitedCount: 0,
      likesReceived: 0,
      commentsReceived: 0,
    });
  });

  it("computeTabiScoreInputsForUsers_空配列を渡すと空のMapを返す", async () => {
    const result = await computeTabiScoreInputsForUsers([]);
    expect(result.size).toBe(0);
  });
});
