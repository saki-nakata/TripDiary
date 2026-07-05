import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/repositories/post.repository", () => ({
  findPostById: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
}));

import { findPostById, createPost, updatePost, deletePost } from "@/lib/repositories/post.repository";
import { createPostService, updatePostService, deletePostService } from "@/lib/services/post.service";

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
