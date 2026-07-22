import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createComment, deleteComment, findCommentsByPostId, findCommentById } from "@/lib/repositories/comment.repository";
import { createPost } from "@/lib/repositories/post.repository";

// 認可チェック（本人のコメントか）はrepository層には無い（deleteCommentはid/postIdのみを受け取り
// userId引数を持たない）ため、権限系のテストケースはService層の責務としてここでは扱わない。

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("comment.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── createComment ───
  it("createComment_呼ぶ_コメントが作成されてcommentCountが+1になる", async () => {
    const user = await createTestUser("c1@example.com", "ユーザー1");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const comment = await createComment({ postId: post.id, authorId: user.id, body: "コメント本文" });

    expect(comment.body).toBe("コメント本文");
    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.commentCount).toBe(1);
  });

  it("createComment_同一投稿へ並行実行しても全件作成されcommentCountが一致する", async () => {
    const user = await createTestUser("c-concurrent@example.com", "並行ユーザー");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const count = 12;

    const comments = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        createComment({ postId: post.id, authorId: user.id, body: `並行コメント${index}` })
      )
    );

    expect(comments).toHaveLength(count);
    expect(await prisma.comment.count({ where: { postId: post.id } })).toBe(count);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).commentCount).toBe(count);
  });

  // ─── deleteComment ───
  it("deleteComment_呼ぶ_削除されてcommentCountが-1になる", async () => {
    const user = await createTestUser("c2@example.com", "ユーザー2");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const comment = await createComment({ postId: post.id, authorId: user.id, body: "コメント本文" });

    await deleteComment(comment.id, post.id);

    const updated = await prisma.post.findUniqueOrThrow({ where: { id: post.id } });
    expect(updated.commentCount).toBe(0);
    expect(await prisma.comment.findUnique({ where: { id: comment.id } })).toBeNull();
  });

  // ─── findCommentsByPostId ───
  it("findCommentsByPostId_複数コメントを作成日時昇順で返す", async () => {
    const user = await createTestUser("c3@example.com", "ユーザー3");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createComment({ postId: post.id, authorId: user.id, body: "1件目" });
    await createComment({ postId: post.id, authorId: user.id, body: "2件目" });

    const result = await findCommentsByPostId({ postId: post.id });

    expect(result.comments.map((c) => c.body)).toEqual(["1件目", "2件目"]);
    expect(result.hasMore).toBe(false);
  });

  it("findCommentsByPostId_コメントなし_空配列を返す(境界値)", async () => {
    const user = await createTestUser("c4@example.com", "ユーザー4");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await findCommentsByPostId({ postId: post.id });

    expect(result.comments).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  // ─── findCommentById ───
  it("findCommentById_存在するID_コメントを返す", async () => {
    const user = await createTestUser("c5@example.com", "ユーザー5");
    const post = await createPost(user.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const comment = await createComment({ postId: post.id, authorId: user.id, body: "コメント本文" });

    const result = await findCommentById(comment.id);

    expect(result?.id).toBe(comment.id);
    expect(result?.authorId).toBe(user.id);
  });

  it("findCommentById_存在しないID_nullを返す(境界値)", async () => {
    expect(await findCommentById("nonexistent-id")).toBeNull();
  });
});
