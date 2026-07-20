import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  findFollowingPosts,
  findLocationCounts,
  createPost,
  findPostsByAuthorId,
  findWishlistedPosts,
  findVisitedPosts,
  countFollowingFeedPosts,
  findExplorePosts,
} from "@/lib/repositories/post.repository";

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
  it("findFollowingPosts_フォロー中ユーザーの投稿のみ取得され自分の投稿は含まれない", async () => {
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

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("フォロー中の投稿");
  });

  it("findFollowingPosts_フォロー中の投稿が新着順で並ぶ", async () => {
    const me = await createTestUser("me2@example.com", "自分2");
    const following = await createTestUser("following3@example.com", "フォロー中3");
    await prisma.follow.create({ data: { followerId: me.id, followingId: following.id } });
    await createPost(following.id, { title: "古い投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(following.id, { title: "新しい投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });

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

  // ─── findPostsByAuthorId ───
  it("findPostsByAuthorId_指定ユーザーの投稿のみ取得される", async () => {
    const me = await createTestUser("me4@example.com", "自分4");
    const other = await createTestUser("other4@example.com", "他人4");
    await createPost(me.id, { title: "自分の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(other.id, { title: "他人の投稿", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-02" });

    const result = await findPostsByAuthorId({ authorId: me.id });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("自分の投稿");
  });

  it("findPostsByAuthorId_yearを指定すると訪問日がその年の投稿のみ取得される", async () => {
    const me = await createTestUser("me4b@example.com", "自分4b");
    await createPost(me.id, { title: "2025年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2025-12-31" });
    await createPost(me.id, { title: "2026年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await findPostsByAuthorId({ authorId: me.id, year: 2026 });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("2026年の投稿");
  });

  it("findPostsByAuthorId_yearを指定しない場合は全年の投稿が取得される(境界値)", async () => {
    const me = await createTestUser("me4c@example.com", "自分4c");
    await createPost(me.id, { title: "2025年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2025-12-31" });
    await createPost(me.id, { title: "2026年の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await findPostsByAuthorId({ authorId: me.id });

    expect(result.posts).toHaveLength(2);
  });

  // ─── findWishlistedPosts / findVisitedPosts ───
  it("findWishlistedPosts_行きたい登録した投稿のみ取得される", async () => {
    const me = await createTestUser("me5@example.com", "自分5");
    const post = await createPost(me.id, { title: "行きたい投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "未登録の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });
    await prisma.wishlist.create({ data: { userId: me.id, postId: post.id } });

    const result = await findWishlistedPosts({ userId: me.id });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("行きたい投稿");
  });

  it("findVisitedPosts_自分の投稿は自動で訪問済みになり、他人の投稿は明示的に登録した場合のみ取得される", async () => {
    const me = await createTestUser("me6@example.com", "自分6");
    const other = await createTestUser("other6@example.com", "他人6");
    await createPost(me.id, { title: "自分の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const otherPost = await createPost(other.id, { title: "他人の投稿（訪問済み登録）", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-02" });
    await createPost(other.id, { title: "他人の投稿（未登録）", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-03" });
    await prisma.visited.create({ data: { userId: me.id, postId: otherPost.id } });

    const result = await findVisitedPosts({ userId: me.id });

    expect(result.posts.map((p) => p.title).sort()).toEqual(["他人の投稿（訪問済み登録）", "自分の投稿"].sort());
  });

  it("createPost_投稿者自身のVisited行が自動作成される", async () => {
    const me = await createTestUser("me6b@example.com", "自分6b");
    const post = await createPost(me.id, { title: "新規投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const visited = await prisma.visited.findUnique({
      where: { userId_postId: { userId: me.id, postId: post.id } },
    });

    expect(visited).not.toBeNull();
  });

  // ─── countFollowingFeedPosts ───
  it("countFollowingFeedPosts_フォロー中ユーザーの投稿数のみで自分の投稿は含まれない", async () => {
    const me = await createTestUser("me7@example.com", "自分7");
    const following = await createTestUser("following2@example.com", "フォロー中2");
    await prisma.follow.create({ data: { followerId: me.id, followingId: following.id } });
    await createPost(me.id, { title: "自分の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(following.id, { title: "フォロー中の投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });

    expect(await countFollowingFeedPosts(me.id)).toBe(1);
  });

  // ─── findExplorePosts（キーワード検索） ───
  it("findExplorePosts_qがタイトルに部分一致_一致する投稿のみ取得される", async () => {
    const me = await createTestUser("me8@example.com", "自分8");
    await createPost(me.id, { title: "嵐山の竹林", body: "本文", location: "京都府", category: "季節・イベント", visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "金閣寺の紅葉", body: "本文", location: "京都府", category: "歴史・文化", visitedAt: "2026-01-02" });

    const result = await findExplorePosts({ q: "竹林" });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("嵐山の竹林");
  });

  it("findExplorePosts_qが本文に部分一致_一致する投稿のみ取得される", async () => {
    const me = await createTestUser("me9@example.com", "自分9");
    await createPost(me.id, { title: "投稿A", body: "美味しいたこ焼きを食べました", location: "大阪府", category: "グルメ", visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "投稿B", body: "静かな竹林を散策しました", location: "京都府", category: "季節・イベント", visitedAt: "2026-01-02" });

    const result = await findExplorePosts({ q: "たこ焼き" });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].title).toBe("投稿A");
  });

  it("findExplorePosts_qが空文字_絞り込みなしで全件取得される(境界値)", async () => {
    const me = await createTestUser("me10@example.com", "自分10");
    await createPost(me.id, { title: "投稿C", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "投稿D", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });

    const result = await findExplorePosts({ q: "" });

    expect(result.posts).toHaveLength(2);
  });

  it("findExplorePosts_qが一致なし_空配列", async () => {
    const me = await createTestUser("me11@example.com", "自分11");
    await createPost(me.id, { title: "投稿E", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    const result = await findExplorePosts({ q: "存在しないキーワード" });

    expect(result.posts).toHaveLength(0);
  });
});
