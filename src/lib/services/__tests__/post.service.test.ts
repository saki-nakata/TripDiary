import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "@/lib/errors";

vi.mock("@/lib/repositories/post.repository", () => ({
  findPostById: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  findStillReferencedUrls: vi.fn(),
  findExplorePosts: vi.fn(),
  findFollowingPosts: vi.fn(),
  findPopularPosts: vi.fn(),
  findLatestPosts: vi.fn(),
  findLocationCounts: vi.fn(),
  findCategoryCounts: vi.fn(),
  findTopRatedByCategory: vi.fn(),
}));
vi.mock("@/lib/repositories/plan.repository", () => ({
  findPlanAuthorId: vi.fn(),
}));
vi.mock("@/lib/s3", () => ({
  deleteOwnedObjectsByUrl: vi.fn(),
  isOwnedS3Url: vi.fn(),
}));

import {
  findPostById,
  createPost,
  updatePost,
  deletePost,
  findStillReferencedUrls,
  findExplorePosts,
  findFollowingPosts,
  findPopularPosts,
  findLatestPosts,
  findLocationCounts,
  findCategoryCounts,
  findTopRatedByCategory,
} from "@/lib/repositories/post.repository";
import { findPlanAuthorId } from "@/lib/repositories/plan.repository";
import { deleteOwnedObjectsByUrl, isOwnedS3Url } from "@/lib/s3";
import {
  createPostService,
  updatePostService,
  deletePostService,
  findPostByIdService,
  findPostForEditService,
  findExplorePostsService,
  findFollowingPostsService,
  getPortalDataService,
} from "@/lib/services/post.service";

const AUTHOR_ID = "author-1";
const OTHER_USER_ID = "other-user-2";
const POST_ID = "post-1";
const VERSION = 0;

const basePostInput = {
  title: "テストスポット",
  body: "感想メモ",
  location: "東京都",
  category: "観光" as const,
  visitedAt: "2026-01-01",
};

const basePostUpdateInput = { ...basePostInput, version: VERSION };

function p2025Error() {
  return new Prisma.PrismaClientKnownRequestError("No record found", { code: "P2025", clientVersion: "6.19.3" });
}

describe("createPostService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── createPost ───
  it("createPost_タイトル40文字_repositoryが呼ばれる", async () => {
    const title40 = "あ".repeat(40);
    vi.mocked(createPost).mockResolvedValue({ id: POST_ID } as never);

    await createPostService(AUTHOR_ID, { ...basePostInput, title: title40 });

    expect(createPost).toHaveBeenCalledWith(AUTHOR_ID, expect.objectContaining({ title: title40 }));
  });

  // ─── planId所有権チェック（4-Bの積み残し・5-Dで対応） ───
  it("createPost_planId未指定_プラン所有権チェックをせず作成される", async () => {
    vi.mocked(createPost).mockResolvedValue({ id: POST_ID } as never);

    await createPostService(AUTHOR_ID, basePostInput);

    expect(findPlanAuthorId).not.toHaveBeenCalled();
    expect(createPost).toHaveBeenCalledWith(AUTHOR_ID, basePostInput);
  });

  it("createPost_他人のplanIdを指定_ForbiddenErrorかつrepository作成が呼ばれない", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(OTHER_USER_ID);

    await expect(
      createPostService(AUTHOR_ID, { ...basePostInput, planId: "plan-1" })
    ).rejects.toThrow(ForbiddenError);
    expect(createPost).not.toHaveBeenCalled();
  });

  it("createPost_存在しないplanId_NotFoundErrorかつrepository作成が呼ばれない", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(null);

    await expect(
      createPostService(AUTHOR_ID, { ...basePostInput, planId: "plan-1" })
    ).rejects.toThrow(NotFoundError);
    expect(createPost).not.toHaveBeenCalled();
  });

  it("createPost_本人のplanIdを指定_正常に作成される", async () => {
    vi.mocked(findPlanAuthorId).mockResolvedValue(AUTHOR_ID);
    vi.mocked(createPost).mockResolvedValue({ id: POST_ID } as never);

    await createPostService(AUTHOR_ID, { ...basePostInput, planId: "plan-1" });

    expect(createPost).toHaveBeenCalledWith(AUTHOR_ID, { ...basePostInput, planId: "plan-1" });
  });

  // ─── 書き込み時URL所有権検証 ───
  it("createPost_own-prefixのimageUrls_正常に作成される", async () => {
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(createPost).mockResolvedValue({ id: POST_ID } as never);

    await createPostService(AUTHOR_ID, { ...basePostInput, imageUrls: ["https://bucket/uploads/author-1/a.jpg"] });

    expect(createPost).toHaveBeenCalled();
  });

  it("createPost_own-prefix外のimageUrls_ValidationErrorかつrepository作成が呼ばれない", async () => {
    vi.mocked(isOwnedS3Url).mockReturnValue(false);

    await expect(
      createPostService(AUTHOR_ID, { ...basePostInput, imageUrls: ["https://bucket/uploads/other-user/a.jpg"] })
    ).rejects.toThrow(ValidationError);
    expect(createPost).not.toHaveBeenCalled();
  });
});

describe("updatePostService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findStillReferencedUrls).mockResolvedValue(new Set());
  });

  // ─── updatePost ───
  it("updatePost_存在しない投稿ID_NotFoundError", async () => {
    vi.mocked(findPostById).mockResolvedValue(null);

    await expect(updatePostService(AUTHOR_ID, POST_ID, basePostUpdateInput)).rejects.toThrow(NotFoundError);
    expect(updatePost).not.toHaveBeenCalled();
  });

  it("updatePost_他人の投稿_ForbiddenErrorかつrepository更新が呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);

    await expect(updatePostService(OTHER_USER_ID, POST_ID, basePostUpdateInput)).rejects.toThrow(ForbiddenError);
    expect(updatePost).not.toHaveBeenCalled();
  });

  it("updatePost_本人の投稿_正常に更新される", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, basePostUpdateInput);

    expect(updatePost).toHaveBeenCalledWith(POST_ID, basePostUpdateInput, VERSION);
  });

  // ─── planId所有権チェック（4-Bの積み残し・5-Dで対応） ───
  it("updatePost_本人の投稿を他人のplanIdに変更_ForbiddenErrorかつrepository更新が呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);
    vi.mocked(findPlanAuthorId).mockResolvedValue(OTHER_USER_ID);

    await expect(
      updatePostService(AUTHOR_ID, POST_ID, { ...basePostUpdateInput, planId: "plan-1" })
    ).rejects.toThrow(ForbiddenError);
    expect(updatePost).not.toHaveBeenCalled();
  });

  it("updatePost_本人の投稿を本人のplanIdに変更_正常に更新される", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);
    vi.mocked(findPlanAuthorId).mockResolvedValue(AUTHOR_ID);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, { ...basePostUpdateInput, planId: "plan-1" });

    expect(updatePost).toHaveBeenCalledWith(POST_ID, { ...basePostUpdateInput, planId: "plan-1" }, VERSION);
  });

  // ─── 楽観ロック ───
  it("updatePost_他の変更と競合(P2025)_ConflictError", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);
    vi.mocked(updatePost).mockRejectedValue(p2025Error());

    await expect(updatePostService(AUTHOR_ID, POST_ID, basePostUpdateInput)).rejects.toThrow(ConflictError);
  });

  it("updatePost_他の変更と競合(P2025)_S3削除は呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: "https://bucket/uploads/author-1/a.jpg" }],
    } as never);
    vi.mocked(updatePost).mockRejectedValue(p2025Error());

    await expect(
      updatePostService(AUTHOR_ID, POST_ID, { ...basePostUpdateInput, imageUrls: [] })
    ).rejects.toThrow(ConflictError);
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  // ─── 書き込み時URL所有権検証 ───
  it("updatePost_own-prefix外かつ更新前から存在しないURL_ValidationErrorかつrepository更新が呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);
    vi.mocked(isOwnedS3Url).mockReturnValue(false);

    await expect(
      updatePostService(AUTHOR_ID, POST_ID, {
        ...basePostUpdateInput,
        imageUrls: ["https://bucket/uploads/other-user/a.jpg"],
      })
    ).rejects.toThrow(ValidationError);
    expect(updatePost).not.toHaveBeenCalled();
  });

  it("updatePost_own-prefixではないが更新前からそのpostに存在するURL_許可される", async () => {
    const existingUrl = "https://bucket/uploads/legacy/a.jpg";
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: existingUrl }],
    } as never);
    vi.mocked(isOwnedS3Url).mockReturnValue(false);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, { ...basePostUpdateInput, imageUrls: [existingUrl] });

    expect(updatePost).toHaveBeenCalled();
  });

  // ─── S3差分削除（DB操作優先・undefinedは全体スキップ） ───
  it("updatePost_既存画像[a,b]から新規[a,c]_bのみS3削除対象になる(所有者ID付き)", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: "https://bucket/uploads/author-1/a.jpg" }, { url: "https://bucket/uploads/author-1/b.jpg" }],
    } as never);
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, {
      ...basePostUpdateInput,
      imageUrls: ["https://bucket/uploads/author-1/a.jpg", "https://bucket/uploads/author-1/c.jpg"],
    });

    expect(deleteOwnedObjectsByUrl).toHaveBeenCalledWith(["https://bucket/uploads/author-1/b.jpg"], AUTHOR_ID);
  });

  it("updatePost_imageUrlsがundefined_書き込み検証もS3削除も実行されない", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: "https://bucket/uploads/author-1/a.jpg" }],
    } as never);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, basePostUpdateInput);

    expect(isOwnedS3Url).not.toHaveBeenCalled();
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  it("updatePost_imageUrlsが空配列_既存画像が全て削除対象になる", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: "https://bucket/uploads/author-1/a.jpg" }],
    } as never);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, { ...basePostUpdateInput, imageUrls: [] });

    expect(deleteOwnedObjectsByUrl).toHaveBeenCalledWith(["https://bucket/uploads/author-1/a.jpg"], AUTHOR_ID);
  });

  it("updatePost_差分が無い(新規imageUrlsが既存と完全一致)_S3削除は呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: "https://bucket/uploads/author-1/a.jpg" }],
    } as never);
    vi.mocked(isOwnedS3Url).mockReturnValue(true);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, {
      ...basePostUpdateInput,
      imageUrls: ["https://bucket/uploads/author-1/a.jpg"],
    });

    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  // ─── 共有URL（presetImageUrl等で他の投稿・アバターからまだ参照されている場合は削除しない） ───
  it("updatePost_除外された画像が他の投稿からまだ参照されている_deleteOwnedObjectsByUrlは呼ばれない", async () => {
    const sharedUrl = "https://bucket/uploads/author-1/shared.jpg";
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: sharedUrl }],
    } as never);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);
    vi.mocked(findStillReferencedUrls).mockResolvedValue(new Set([sharedUrl]));

    await updatePostService(AUTHOR_ID, POST_ID, { ...basePostUpdateInput, imageUrls: [] });

    expect(findStillReferencedUrls).toHaveBeenCalledWith([sharedUrl]);
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });
});

describe("deletePostService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findStillReferencedUrls).mockResolvedValue(new Set());
  });

  // ─── deletePost ───
  it("deletePost_存在しない投稿ID_NotFoundError", async () => {
    vi.mocked(findPostById).mockResolvedValue(null);

    await expect(deletePostService(AUTHOR_ID, POST_ID)).rejects.toThrow(NotFoundError);
    expect(deletePost).not.toHaveBeenCalled();
  });

  it("deletePost_他人の投稿_ForbiddenErrorかつrepository削除が呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);

    await expect(deletePostService(OTHER_USER_ID, POST_ID)).rejects.toThrow(ForbiddenError);
    expect(deletePost).not.toHaveBeenCalled();
  });

  it("deletePost_本人の投稿_repositoryの削除が呼ばれる", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);
    vi.mocked(deletePost).mockResolvedValue({} as never);

    await deletePostService(AUTHOR_ID, POST_ID);

    expect(deletePost).toHaveBeenCalledWith(POST_ID);
  });

  // ─── S3削除（DB操作優先） ───
  it("deletePost_画像がある投稿_deletePost成功後にdeleteOwnedObjectsByUrlが所有者ID付きで呼ばれる", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: "https://bucket/uploads/author-1/a.jpg" }, { url: "https://bucket/uploads/author-1/b.jpg" }],
    } as never);
    vi.mocked(deletePost).mockResolvedValue({} as never);

    await deletePostService(AUTHOR_ID, POST_ID);

    expect(deleteOwnedObjectsByUrl).toHaveBeenCalledWith(
      ["https://bucket/uploads/author-1/a.jpg", "https://bucket/uploads/author-1/b.jpg"],
      AUTHOR_ID
    );
  });

  it("deletePost_画像が0件の投稿_deleteOwnedObjectsByUrlは呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID, images: [] } as never);
    vi.mocked(deletePost).mockResolvedValue({} as never);

    await deletePostService(AUTHOR_ID, POST_ID);

    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  it("deletePost失敗時_deleteOwnedObjectsByUrlは呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: "https://bucket/uploads/author-1/a.jpg" }],
    } as never);
    vi.mocked(deletePost).mockRejectedValue(new Error("db error"));

    await expect(deletePostService(AUTHOR_ID, POST_ID)).rejects.toThrow("db error");
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });

  // ─── 共有URL（同一URLが別の投稿からまだ参照されている場合は削除しない） ───
  it("deletePost_画像が別の投稿からまだ参照されている_deleteOwnedObjectsByUrlは呼ばれない", async () => {
    const sharedUrl = "https://bucket/uploads/author-1/shared.jpg";
    vi.mocked(findPostById).mockResolvedValue({
      authorId: AUTHOR_ID,
      images: [{ url: sharedUrl }],
    } as never);
    vi.mocked(deletePost).mockResolvedValue({} as never);
    vi.mocked(findStillReferencedUrls).mockResolvedValue(new Set([sharedUrl]));

    await deletePostService(AUTHOR_ID, POST_ID);

    expect(findStillReferencedUrls).toHaveBeenCalledWith([sharedUrl]);
    expect(deleteOwnedObjectsByUrl).not.toHaveBeenCalled();
  });
});

describe("findPostByIdService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しない投稿ID_NotFoundError", async () => {
    vi.mocked(findPostById).mockResolvedValue(null);

    await expect(findPostByIdService(POST_ID)).rejects.toThrow(NotFoundError);
  });

  it("存在する投稿ID_投稿を返す", async () => {
    vi.mocked(findPostById).mockResolvedValue({ id: POST_ID, authorId: AUTHOR_ID } as never);

    const result = await findPostByIdService(POST_ID, "viewer-1");

    expect(findPostById).toHaveBeenCalledWith(POST_ID, "viewer-1");
    expect(result).toEqual({ id: POST_ID, authorId: AUTHOR_ID });
  });
});

describe("findPostForEditService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("本人が編集画面用に取得_findPostByIdをuserId付きで呼び費用内訳を含む結果を返す（第4ラウンドA-1の回帰防止）", async () => {
    vi.mocked(findPostById).mockResolvedValue({
      id: POST_ID,
      authorId: AUTHOR_ID,
      cost: 1000,
      costBreakdown: [{ label: "交通費", amount: 1000 }],
    } as never);

    const result = await findPostForEditService(AUTHOR_ID, POST_ID);

    // userIdなしで呼ぶとformatPost側の本人判定に失敗し費用内訳が除外される（A-1のバグ）ため、
    // 呼び出し引数そのものを固定して回帰を防ぐ
    expect(findPostById).toHaveBeenCalledWith(POST_ID, AUTHOR_ID);
    expect(result).toMatchObject({ cost: 1000, costBreakdown: [{ label: "交通費", amount: 1000 }] });
  });

  it("存在しない投稿ID_NotFoundError", async () => {
    vi.mocked(findPostById).mockResolvedValue(null);

    await expect(findPostForEditService(AUTHOR_ID, POST_ID)).rejects.toThrow(NotFoundError);
  });

  it("他人の投稿を編集画面用に取得_ForbiddenError", async () => {
    vi.mocked(findPostById).mockResolvedValue({ id: POST_ID, authorId: AUTHOR_ID } as never);

    await expect(findPostForEditService(OTHER_USER_ID, POST_ID)).rejects.toThrow(ForbiddenError);
  });
});

describe("findExplorePostsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("引数をそのままrepositoryに渡し結果を返す", async () => {
    vi.mocked(findExplorePosts).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    const options = { cursor: undefined, limit: 20, sort: "latest" as const, userId: undefined };
    const result = await findExplorePostsService(options);

    expect(findExplorePosts).toHaveBeenCalledWith(options);
    expect(result).toEqual({ posts: [], nextCursor: null, hasMore: false });
  });
});

describe("findFollowingPostsService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("引数をそのままrepositoryに渡し結果を返す", async () => {
    vi.mocked(findFollowingPosts).mockResolvedValue({ posts: [], nextCursor: null, hasMore: false });

    const options = { userId: AUTHOR_ID, cursor: undefined, limit: 20 };
    const result = await findFollowingPostsService(options);

    expect(findFollowingPosts).toHaveBeenCalledWith(options);
    expect(result).toEqual({ posts: [], nextCursor: null, hasMore: false });
  });
});

describe("getPortalDataService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("popularのIDを使ってtopRatedを取得し全セクションをまとめて返す", async () => {
    vi.mocked(findPopularPosts).mockResolvedValue([{ id: "p1" }, { id: "p2" }] as never);
    vi.mocked(findLatestPosts).mockResolvedValue([{ id: "l1" }] as never);
    vi.mocked(findLocationCounts).mockResolvedValue([{ location: "東京都", count: 3 }] as never);
    vi.mocked(findCategoryCounts).mockResolvedValue([{ category: "観光", count: 2 }] as never);
    vi.mocked(findTopRatedByCategory).mockResolvedValue([{ id: "t1" }] as never);

    const result = await getPortalDataService();

    expect(findTopRatedByCategory).toHaveBeenCalledWith(["p1", "p2"]);
    expect(result).toEqual({
      popular: [{ id: "p1" }, { id: "p2" }],
      latest: [{ id: "l1" }],
      locations: [{ location: "東京都", count: 3 }],
      categories: [{ category: "観光", count: 2 }],
      topRated: [{ id: "t1" }],
    });
  });
});
