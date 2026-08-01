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
  findUserPasswordHash,
  findUserPasswordHashAndEmail,
  findUserThemePreference,
  updateUserThemePreference,
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

  it("searchUsersByNickname_件数は非正規化カウンタ(followerCount)と投稿数のライブ集計を反映する", async () => {
    const target = await createTestUser("target@example.com", "対象ユーザー");
    const follower = await createTestUser("follower@example.com", "フォロワー");
    await prisma.follow.create({ data: { followerId: follower.id, followingId: target.id } });
    await prisma.user.update({ where: { id: target.id }, data: { followerCount: { increment: 1 } } });
    await createPost(target.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await searchUsersByNickname({ q: "対象ユーザー" });

    expect(result.users[0]._count).toEqual({ posts: 1, followers: 1 });
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

  // ─── findUserPasswordHash / findUserPasswordHashAndEmail ───
  it("findUserPasswordHash_通常ユーザー_passwordとisProtectedを返す", async () => {
    const user = await prisma.user.create({
      data: { email: "protected-flag@example.com", nickname: "対象者", password: "hashed-pw", isProtected: true },
    });

    expect(await findUserPasswordHash(user.id)).toEqual({ password: "hashed-pw", isProtected: true });
  });

  it("findUserPasswordHash_passwordがnullのユーザー(OAuth連携等)_nullを返す", async () => {
    const user = await prisma.user.create({
      data: { email: "oauth-user@example.com", nickname: "OAuth利用者", password: null },
    });

    expect(await findUserPasswordHash(user.id)).toBeNull();
  });

  it("findUserPasswordHash_存在しないID_nullを返す", async () => {
    expect(await findUserPasswordHash("nonexistent-id")).toBeNull();
  });

  it("findUserPasswordHashAndEmail_通常ユーザー_password_email_isProtectedを返す", async () => {
    const user = await createTestUser("password-and-email@example.com", "対象者2");

    expect(await findUserPasswordHashAndEmail(user.id)).toEqual({
      password: "hashed",
      email: "password-and-email@example.com",
      isProtected: false,
    });
  });

  it("updateUser_nickname_bio_imageが更新される", async () => {
    const user = await createTestUser("update@example.com", "更新前");

    const updated = await updateUser(user.id, { nickname: "更新後", bio: "自己紹介", image: "/uploads/a.jpg" }, user.version);

    expect(updated).toEqual({ id: user.id, nickname: "更新後", bio: "自己紹介", image: "/uploads/a.jpg" });
  });

  it("updateUser_versionが実際と異なる_失敗する(楽観ロック)", async () => {
    const user = await createTestUser("update-stale@example.com", "更新前2");
    const staleVersion = user.version + 1;

    await expect(
      updateUser(user.id, { nickname: "更新後2", bio: null, image: null }, staleVersion)
    ).rejects.toThrow();
  });

  it("updateUser_同一versionで2件を同時実行_片方のみ成功しもう片方は失敗する（GATE-04、実DB並行更新）", async () => {
    const user = await createTestUser("update-concurrent@example.com", "並行更新前");

    const results = await Promise.allSettled([
      updateUser(user.id, { nickname: "並行更新A", bio: null, image: null }, user.version),
      updateUser(user.id, { nickname: "並行更新B", bio: null, image: null }, user.version),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.version).toBe(user.version + 1);
  });

  it("updateUser_異なるユーザーへの同時更新は競合せずどちらも成功する（GATE-04、非競合時の正常系）", async () => {
    const userA = await createTestUser("update-concurrent-a@example.com", "並行A更新前");
    const userB = await createTestUser("update-concurrent-b@example.com", "並行B更新前");

    const results = await Promise.allSettled([
      updateUser(userA.id, { nickname: "並行A更新後", bio: null, image: null }, userA.version),
      updateUser(userB.id, { nickname: "並行B更新後", bio: null, image: null }, userB.version),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
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
    // createPostは投稿者自身のVisited行を自動作成するため、明示的なvisited.createは不要（2件とも自動で訪問済みになる）
    await prisma.like.create({ data: { userId: other.id, postId: post.id } });
    await prisma.comment.create({ data: { authorId: other.id, postId: post.id, body: "コメント" } });
    // countLikesReceived/countCommentsReceivedは非正規化カラムを参照するため、直接作成したlike/commentに合わせて手動で反映する
    await prisma.post.update({ where: { id: post.id }, data: { likeCount: { increment: 1 }, commentCount: { increment: 1 } } });

    expect(await countUserPosts(author.id)).toBe(2);
    expect(await countVisitedByUser(author.id)).toBe(2);
    expect(await countLikesReceived(author.id)).toBe(1);
    expect(await countCommentsReceived(author.id)).toBe(1);
  });

  it("countUserPosts_yearを指定すると訪問日がその年の投稿のみカウントされる", async () => {
    const author = await createTestUser("author-year@example.com", "投稿者年度");
    await createPost(author.id, { title: "2025年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2025-12-31" });
    await createPost(author.id, { title: "2026年の投稿A", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(author.id, { title: "2026年の投稿B", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-06-01" });

    expect(await countUserPosts(author.id, 2026)).toBe(2);
    expect(await countUserPosts(author.id, 2025)).toBe(1);
    expect(await countUserPosts(author.id)).toBe(3);
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

    const written = await findCommentsByAuthor({ authorId: commenter.id });
    const received = await findCommentsReceivedByAuthor({ authorId: author.id });

    expect(written.comments).toHaveLength(1);
    expect(written.comments[0].body).toBe("投稿者への感想");
    expect(written.comments[0].post.images).toEqual([{ url: "/uploads/post3.jpg" }]);
    expect(written.comments[0].post.author.id).toBe(author.id);
    expect(written.hasMore).toBe(false);
    expect(received.comments).toHaveLength(1);
    expect(received.comments[0].author.id).toBe(commenter.id);
    expect(received.comments[0].post.images).toEqual([{ url: "/uploads/post3.jpg" }]);
    expect(received.hasMore).toBe(false);
  });

  // ─── findCommentsByAuthor / findCommentsReceivedByAuthor（GATE-22種類B: cursorページング） ───
  it("findCommentsByAuthor_51件目以降もcursorで継続取得できる", async () => {
    const commenter = await createTestUser("comment-cursor1@example.com", "コメント投稿者cursor1");
    const author = await createTestUser("comment-cursor2@example.com", "投稿者cursor2");
    const post = await createPost(author.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    for (let i = 0; i < 51; i++) {
      await prisma.comment.create({ data: { authorId: commenter.id, postId: post.id, body: `コメント${i}` } });
    }

    const page1 = await findCommentsByAuthor({ authorId: commenter.id, limit: 50 });
    expect(page1.comments).toHaveLength(50);
    expect(page1.hasMore).toBe(true);

    const page2 = await findCommentsByAuthor({ authorId: commenter.id, limit: 50, cursor: page1.nextCursor! });
    expect(page2.comments).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = new Set([...page1.comments, ...page2.comments].map((c) => c.id));
    expect(allIds.size).toBe(51);
  });

  it("findCommentsByAuthor_createdAtが同一のコメント群_idタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const commenter = await createTestUser("comment-tie1@example.com", "コメント投稿者tie1");
    const author = await createTestUser("comment-tie2@example.com", "投稿者tie2");
    const post = await createPost(author.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const c1 = await prisma.comment.create({ data: { authorId: commenter.id, postId: post.id, body: "コメントA" } });
    const c2 = await prisma.comment.create({ data: { authorId: commenter.id, postId: post.id, body: "コメントB" } });
    const c3 = await prisma.comment.create({ data: { authorId: commenter.id, postId: post.id, body: "コメントC" } });
    const sameCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.comment.updateMany({ where: { id: { in: [c1.id, c2.id, c3.id] } }, data: { createdAt: sameCreatedAt } });

    const page1 = await findCommentsByAuthor({ authorId: commenter.id, limit: 2 });
    expect(page1.comments).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findCommentsByAuthor({ authorId: commenter.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.comments).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.comments, ...page2.comments].map((c) => c.id).sort();
    expect(allIds).toEqual([c1.id, c2.id, c3.id].sort());
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
    // createPostは投稿者自身のVisited行を自動作成するため、明示的なvisited.createは不要（2件とも自動で訪問済みになる）
    await prisma.like.create({ data: { userId: other.id, postId: post.id } });
    await prisma.comment.create({ data: { authorId: other.id, postId: post.id, body: "いいね" } });
    // computeTabiScoreInputsForUsersは非正規化カラムを参照するため、直接作成したlike/commentに合わせて手動で反映する
    await prisma.post.update({ where: { id: post.id }, data: { likeCount: { increment: 1 }, commentCount: { increment: 1 } } });

    const result = await computeTabiScoreInputsForUsers([active.id, idle.id]);

    expect(result.get(active.id)).toEqual({
      postCount: 2,
      visitedCount: 2,
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

describe("themePreference", () => {
  it("findUserThemePreference_未設定のユーザーはnullを返す", async () => {
    const user = await createTestUser("theme1@example.com", "テーマ1");

    const result = await findUserThemePreference(user.id);

    expect(result).toBeNull();
  });

  it("updateUserThemePreference_値を保存しfindUserThemePreferenceで取得できる", async () => {
    const user = await createTestUser("theme2@example.com", "テーマ2");

    await updateUserThemePreference(user.id, "dark");
    const result = await findUserThemePreference(user.id);

    expect(result).toBe("dark");
  });

  it("updateUserThemePreference_versionを増やさない（楽観ロック用カウンタと無関係）", async () => {
    const user = await createTestUser("theme3@example.com", "テーマ3");

    await updateUserThemePreference(user.id, "light");

    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { version: true } });
    expect(reloaded.version).toBe(0);
  });
});
