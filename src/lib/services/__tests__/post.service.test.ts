import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/repositories/post.repository", () => ({
  findPostById: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
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

import {
  findPostById,
  createPost,
  updatePost,
  deletePost,
  findExplorePosts,
  findFollowingPosts,
  findPopularPosts,
  findLatestPosts,
  findLocationCounts,
  findCategoryCounts,
  findTopRatedByCategory,
} from "@/lib/repositories/post.repository";
import { findPlanAuthorId } from "@/lib/repositories/plan.repository";
import {
  createPostService,
  updatePostService,
  deletePostService,
  findPostByIdService,
  findExplorePostsService,
  findFollowingPostsService,
  getPortalDataService,
} from "@/lib/services/post.service";

const AUTHOR_ID = "author-1";
const OTHER_USER_ID = "other-user-2";
const POST_ID = "post-1";

const basePostInput = {
  title: "テストスポット",
  body: "感想メモ",
  location: "東京都",
  category: "観光" as const,
  visitedAt: "2026-01-01",
};

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
});

describe("updatePostService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── updatePost ───
  it("updatePost_存在しない投稿ID_NotFoundError", async () => {
    vi.mocked(findPostById).mockResolvedValue(null);

    await expect(updatePostService(AUTHOR_ID, POST_ID, basePostInput)).rejects.toThrow(NotFoundError);
    expect(updatePost).not.toHaveBeenCalled();
  });

  it("updatePost_他人の投稿_ForbiddenErrorかつrepository更新が呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID } as never);

    await expect(updatePostService(OTHER_USER_ID, POST_ID, basePostInput)).rejects.toThrow(ForbiddenError);
    expect(updatePost).not.toHaveBeenCalled();
  });

  it("updatePost_本人の投稿_正常に更新される", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID } as never);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, basePostInput);

    expect(updatePost).toHaveBeenCalledWith(POST_ID, basePostInput);
  });

  // ─── planId所有権チェック（4-Bの積み残し・5-Dで対応） ───
  it("updatePost_本人の投稿を他人のplanIdに変更_ForbiddenErrorかつrepository更新が呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID } as never);
    vi.mocked(findPlanAuthorId).mockResolvedValue(OTHER_USER_ID);

    await expect(
      updatePostService(AUTHOR_ID, POST_ID, { ...basePostInput, planId: "plan-1" })
    ).rejects.toThrow(ForbiddenError);
    expect(updatePost).not.toHaveBeenCalled();
  });

  it("updatePost_本人の投稿を本人のplanIdに変更_正常に更新される", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID } as never);
    vi.mocked(findPlanAuthorId).mockResolvedValue(AUTHOR_ID);
    vi.mocked(updatePost).mockResolvedValue({ id: POST_ID } as never);

    await updatePostService(AUTHOR_ID, POST_ID, { ...basePostInput, planId: "plan-1" });

    expect(updatePost).toHaveBeenCalledWith(POST_ID, { ...basePostInput, planId: "plan-1" });
  });
});

describe("deletePostService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── deletePost ───
  it("deletePost_存在しない投稿ID_NotFoundError", async () => {
    vi.mocked(findPostById).mockResolvedValue(null);

    await expect(deletePostService(AUTHOR_ID, POST_ID)).rejects.toThrow(NotFoundError);
    expect(deletePost).not.toHaveBeenCalled();
  });

  it("deletePost_他人の投稿_ForbiddenErrorかつrepository削除が呼ばれない", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID } as never);

    await expect(deletePostService(OTHER_USER_ID, POST_ID)).rejects.toThrow(ForbiddenError);
    expect(deletePost).not.toHaveBeenCalled();
  });

  it("deletePost_本人の投稿_repositoryの削除が呼ばれる", async () => {
    vi.mocked(findPostById).mockResolvedValue({ authorId: AUTHOR_ID } as never);
    vi.mocked(deletePost).mockResolvedValue({} as never);

    await deletePostService(AUTHOR_ID, POST_ID);

    expect(deletePost).toHaveBeenCalledWith(POST_ID);
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
