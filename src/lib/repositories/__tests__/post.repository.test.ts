import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  findFollowingPosts,
  findLocationCounts,
  createPost,
  updatePost,
  findStillReferencedUrls,
  findPostsByAuthorId,
  findWishlistedPosts,
  findVisitedPosts,
  countFollowingFeedPosts,
  findExplorePosts,
  findTopRatedByCategory,
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
    await createPost(me.id, {
      title: "投稿A", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01", imageUrls: ["https://example.com/tokyo.jpg"],
    });
    await createPost(me.id, { title: "投稿B", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-02" });
    await createPost(me.id, { title: "投稿C", body: "本文", location: "大阪府", category: "観光", visitedAt: "2026-01-03" });

    const counts = await findLocationCounts();
    const tokyo = counts.find((c) => c.location === "東京都");
    const osaka = counts.find((c) => c.location === "大阪府");

    expect(tokyo?.count).toBe(2);
    expect(tokyo?.thumbnailUrl).toBe("https://example.com/tokyo.jpg");
    expect(osaka?.count).toBe(1);
    expect(osaka?.thumbnailUrl).toBeNull();
  });

  // ─── findTopRatedByCategory ───
  it("findTopRatedByCategory_カテゴリごとに最高評価の投稿が1件ずつ返る", async () => {
    const me = await createTestUser("me-toprated@example.com", "自分");
    await createPost(me.id, { title: "観光A（評価3）", body: "本文", location: "東京都", category: "観光", rating: 3, visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "観光B（評価5）", body: "本文", location: "東京都", category: "観光", rating: 5, visitedAt: "2026-01-02" });
    await createPost(me.id, { title: "グルメA（評価4）", body: "本文", location: "大阪府", category: "グルメ", rating: 4, visitedAt: "2026-01-03" });
    // 評価なしの投稿は対象外
    await createPost(me.id, { title: "評価なし", body: "本文", location: "京都府", category: "観光", visitedAt: "2026-01-04" });

    const result = await findTopRatedByCategory();

    expect(result).toHaveLength(2);
    expect(result.map((p) => p.title)).toEqual(["観光B（評価5）", "グルメA（評価4）"]);
    const sightseeing = result.find((p) => p.category === "観光");
    const gourmet = result.find((p) => p.category === "グルメ");
    expect(sightseeing?.title).toBe("観光B（評価5）");
    expect(gourmet?.title).toBe("グルメA（評価4）");
  });

  it("findTopRatedByCategory_excludeIdsで除外した投稿は対象外になる", async () => {
    const me = await createTestUser("me-toprated2@example.com", "自分");
    const excluded = await createPost(me.id, { title: "除外対象（評価5）", body: "本文", location: "東京都", category: "観光", rating: 5, visitedAt: "2026-01-01" });
    await createPost(me.id, { title: "次点（評価3）", body: "本文", location: "東京都", category: "観光", rating: 3, visitedAt: "2026-01-02" });

    const result = await findTopRatedByCategory([excluded.id]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("次点（評価3）");
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

  // ─── updatePost（楽観ロック） ───
  it("updatePost_updatedAtが実際と異なる_失敗しPostImage行はロールバックされ残る", async () => {
    const me = await createTestUser("me12@example.com", "自分12");
    const post = await createPost(me.id, {
      title: "投稿F",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      imageUrls: ["https://example.com/before.jpg"],
    });

    const staleUpdatedAt = new Date(new Date(post.updatedAt).getTime() - 1000 * 60);

    await expect(
      updatePost(
        post.id,
        {
          title: "投稿F（更新後）",
          body: "本文",
          location: "東京都",
          category: "観光",
          visitedAt: "2026-01-01",
          imageUrls: ["https://example.com/after.jpg"],
          updatedAt: staleUpdatedAt.toISOString(),
        },
        staleUpdatedAt
      )
    ).rejects.toThrow();

    const images = await prisma.postImage.findMany({ where: { postId: post.id } });
    expect(images).toHaveLength(1);
    expect(images[0].url).toBe("https://example.com/before.jpg");
  });

  it("updatePost_updatedAtが実際と一致_更新が成功する", async () => {
    const me = await createTestUser("me13@example.com", "自分13");
    const post = await createPost(me.id, {
      title: "投稿G",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      imageUrls: ["https://example.com/before.jpg"],
    });

    await updatePost(
      post.id,
      {
        title: "投稿G（更新後）",
        body: "本文",
        location: "東京都",
        category: "観光",
        visitedAt: "2026-01-01",
        imageUrls: ["https://example.com/after.jpg"],
        updatedAt: post.updatedAt,
      },
      new Date(post.updatedAt)
    );

    const updated = await prisma.post.findUnique({ where: { id: post.id } });
    expect(updated?.title).toBe("投稿G（更新後）");
    const images = await prisma.postImage.findMany({ where: { postId: post.id } });
    expect(images).toHaveLength(1);
    expect(images[0].url).toBe("https://example.com/after.jpg");
  });

  // ─── cursorページングのidタイブレーカー（GATE-22、同一createdAtの境界値） ───
  it("findPostsByAuthorId_createdAtが同一の投稿群_idタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("me-tie1@example.com", "自分tie1");
    const p1 = await createPost(me.id, { title: "同時刻A", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p2 = await createPost(me.id, { title: "同時刻B", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p3 = await createPost(me.id, { title: "同時刻C", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const sameCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.post.updateMany({ where: { id: { in: [p1.id, p2.id, p3.id] } }, data: { createdAt: sameCreatedAt } });

    const page1 = await findPostsByAuthorId({ authorId: me.id, limit: 2 });
    expect(page1.posts).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await findPostsByAuthorId({ authorId: me.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.posts).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.posts, ...page2.posts].map((p) => p.id).sort();
    expect(allIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it("findExplorePosts_createdAtが同一の投稿群_idタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("me-tie2@example.com", "自分tie2");
    const p1 = await createPost(me.id, { title: "同時刻D", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p2 = await createPost(me.id, { title: "同時刻E", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p3 = await createPost(me.id, { title: "同時刻F", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const sameCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.post.updateMany({ where: { id: { in: [p1.id, p2.id, p3.id] } }, data: { createdAt: sameCreatedAt } });

    const page1 = await findExplorePosts({ limit: 2 });
    expect(page1.posts).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findExplorePosts({ limit: 2, cursor: page1.nextCursor! });
    expect(page2.posts).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.posts, ...page2.posts].map((p) => p.id).sort();
    expect(allIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it("findFollowingPosts_createdAtが同一の投稿群_idタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("me-tie3@example.com", "自分tie3");
    const following = await createTestUser("following-tie3@example.com", "フォロー中tie3");
    await prisma.follow.create({ data: { followerId: me.id, followingId: following.id } });
    const p1 = await createPost(following.id, { title: "同時刻G", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p2 = await createPost(following.id, { title: "同時刻H", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p3 = await createPost(following.id, { title: "同時刻I", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const sameCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.post.updateMany({ where: { id: { in: [p1.id, p2.id, p3.id] } }, data: { createdAt: sameCreatedAt } });

    const page1 = await findFollowingPosts({ userId: me.id, limit: 2 });
    expect(page1.posts).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findFollowingPosts({ userId: me.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.posts).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.posts, ...page2.posts].map((p) => p.id).sort();
    expect(allIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it("findWishlistedPosts_登録日時が同一の投稿群_postIdタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("me-tie4@example.com", "自分tie4");
    const p1 = await createPost(me.id, { title: "行きたいJ", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p2 = await createPost(me.id, { title: "行きたいK", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p3 = await createPost(me.id, { title: "行きたいL", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await prisma.wishlist.create({ data: { userId: me.id, postId: p1.id } });
    await prisma.wishlist.create({ data: { userId: me.id, postId: p2.id } });
    await prisma.wishlist.create({ data: { userId: me.id, postId: p3.id } });
    const sameCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.wishlist.updateMany({ where: { postId: { in: [p1.id, p2.id, p3.id] } }, data: { createdAt: sameCreatedAt } });

    const page1 = await findWishlistedPosts({ userId: me.id, limit: 2 });
    expect(page1.posts).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findWishlistedPosts({ userId: me.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.posts).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.posts, ...page2.posts].map((p) => p.id).sort();
    expect(allIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  it("findVisitedPosts_登録日時が同一の投稿群_postIdタイブレーカーで重複も欠落もなく全件取得できる", async () => {
    const me = await createTestUser("me-tie5@example.com", "自分tie5");
    const other = await createTestUser("other-tie5@example.com", "他人tie5");
    const p1 = await createPost(other.id, { title: "訪問済みM", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p2 = await createPost(other.id, { title: "訪問済みN", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    const p3 = await createPost(other.id, { title: "訪問済みO", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await prisma.visited.create({ data: { userId: me.id, postId: p1.id } });
    await prisma.visited.create({ data: { userId: me.id, postId: p2.id } });
    await prisma.visited.create({ data: { userId: me.id, postId: p3.id } });
    const sameCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    await prisma.visited.updateMany({ where: { postId: { in: [p1.id, p2.id, p3.id] }, userId: me.id }, data: { createdAt: sameCreatedAt } });

    const page1 = await findVisitedPosts({ userId: me.id, limit: 2 });
    expect(page1.posts).toHaveLength(2);
    expect(page1.hasMore).toBe(true);

    const page2 = await findVisitedPosts({ userId: me.id, limit: 2, cursor: page1.nextCursor! });
    expect(page2.posts).toHaveLength(1);
    expect(page2.hasMore).toBe(false);

    const allIds = [...page1.posts, ...page2.posts].map((p) => p.id).sort();
    expect(allIds).toEqual([p1.id, p2.id, p3.id].sort());
  });

  // ─── findStillReferencedUrls（共有URLの安全な削除判定） ───
  it("findStillReferencedUrls_他の投稿のPostImageに一致するURL_参照ありとして返す", async () => {
    const me = await createTestUser("me14@example.com", "自分14");
    await createPost(me.id, {
      title: "投稿H",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      imageUrls: ["https://example.com/shared.jpg"],
    });

    const result = await findStillReferencedUrls(["https://example.com/shared.jpg", "https://example.com/unused.jpg"]);

    expect(result.has("https://example.com/shared.jpg")).toBe(true);
    expect(result.has("https://example.com/unused.jpg")).toBe(false);
  });

  it("findStillReferencedUrls_User.imageに一致するURL_参照ありとして返す", async () => {
    const me = await createTestUser("me15@example.com", "自分15");
    await prisma.user.update({ where: { id: me.id }, data: { image: "https://example.com/avatar.jpg" } });

    const result = await findStillReferencedUrls(["https://example.com/avatar.jpg"]);

    expect(result.has("https://example.com/avatar.jpg")).toBe(true);
  });

  it("findStillReferencedUrls_空配列_DBに問い合わせず空集合を返す", async () => {
    const result = await findStillReferencedUrls([]);

    expect(result.size).toBe(0);
  });
});
