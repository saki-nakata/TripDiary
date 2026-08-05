import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const BUCKET = "test-bucket";
const REGION = "ap-northeast-1";
const HOSTNAME = `${BUCKET}.s3.${REGION}.amazonaws.com`;

const { sendMock, S3ClientMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  const S3ClientMock = vi.fn(function S3Client() {
    return { send: sendMock };
  });
  return { sendMock, S3ClientMock };
});

// AWS SDKの境界だけをモックし、s3.ts・post.service.ts・post.repository.tsは実物を通す。
// 単体テスト（モジュール境界でのモック）では見えない層間の結合バグ（特に共有URLの削除保護の実際の連携）を、
// 実DB込みで検証するための統合テスト。
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: vi.fn(function PutObjectCommand(this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
  DeleteObjectsCommand: vi.fn(function DeleteObjectsCommand(this: { input: unknown }, input: unknown) {
    this.input = input;
  }),
}));

import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { createPostService, deletePostService, updatePostService, findPostForEditService } from "@/lib/services/post.service";

function ownedUrl(userId: string, filename: string) {
  return `https://${HOSTNAME}/uploads/${userId}/${filename}`;
}

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

describe("post.service 統合テスト（実DB + 実service/repository層、AWS SDKのみモック）", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
    process.env.AWS_REGION = REGION;
    process.env.AWS_S3_BUCKET_NAME = BUCKET;
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it("presetImageUrlで他投稿の画像を引き継ぎ(同一URLを共有)、元の投稿を削除しても引き継いだ投稿の画像はS3から消えない", async () => {
    const user = await createTestUser("shared-image@example.com", "共有太郎");
    const sharedUrl = ownedUrl(user.id, "shared.jpg");

    const postA = await createPostService(user.id, {
      title: "投稿A",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      imageUrls: [sharedUrl],
    });

    // presetImageUrlで投稿Aの画像URLをそのまま新規投稿Bへ引き継ぐ（同一URLを共有する状態になる）
    const postB = await createPostService(user.id, {
      title: "投稿B（presetImageUrlで引き継ぎ）",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-02",
      imageUrls: [sharedUrl],
    });
    expect((postB as { images: { url: string }[] }).images[0].url).toBe(sharedUrl);

    // 投稿Aを削除しても、投稿Bがまだ同じURLを参照しているためS3からは削除されない
    await deletePostService(user.id, postA.id);

    expect(DeleteObjectsCommand).not.toHaveBeenCalled();

    const postBImages = await prisma.postImage.findMany({ where: { postId: postB.id } });
    expect(postBImages).toHaveLength(1);
    expect(postBImages[0].url).toBe(sharedUrl);
  });

  it("共有されていない画像は、投稿削除時にそのままS3から削除される", async () => {
    const user = await createTestUser("fresh-image@example.com", "新規太郎");
    const freshUrl = ownedUrl(user.id, "fresh.jpg");

    const post = await createPostService(user.id, {
      title: "投稿C",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      imageUrls: [freshUrl],
    });

    await deletePostService(user.id, post.id);

    expect(DeleteObjectsCommand).toHaveBeenCalledWith({
      Bucket: BUCKET,
      Delete: { Objects: [{ Key: `uploads/${user.id}/fresh.jpg` }] },
    });
  });

  it("投稿編集画面用の取得で費用内訳が含まれ、タイトルだけ編集して保存しても内訳が保持される（第4ラウンドA-1の回帰防止）", async () => {
    const author = await createTestUser("cost-edit-author@example.com", "編集太郎");

    const created = await createPostService(author.id, {
      title: "編集前タイトル",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      costBreakdown: [{ label: "交通費", amount: 1000 }, { label: "食費", amount: 2000 }],
    });

    // 編集画面用の取得（findPostForEditService）が費用内訳を含んで返すこと
    const forEdit = await findPostForEditService(author.id, created.id);
    expect(forEdit.cost).toBe(3000);
    expect(forEdit.costBreakdown).toEqual([
      { label: "交通費", amount: 1000 },
      { label: "食費", amount: 2000 },
    ]);

    // 編集画面用の取得結果をそのままフォームへ反映し、タイトルだけ変更して保存する想定
    await updatePostService(author.id, created.id, {
      title: "編集後タイトル",
      body: "本文",
      location: "東京都",
      category: "観光",
      visitedAt: "2026-01-01",
      costBreakdown: forEdit.costBreakdown,
      version: 0,
    });

    // 保存後に再度編集画面用の取得を行い、費用内訳が消えていないこと
    const afterEdit = await findPostForEditService(author.id, created.id);
    expect(afterEdit.title).toBe("編集後タイトル");
    expect(afterEdit.cost).toBe(3000);
    expect(afterEdit.costBreakdown).toEqual([
      { label: "交通費", amount: 1000 },
      { label: "食費", amount: 2000 },
    ]);
  });
});
