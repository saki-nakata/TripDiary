import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/repositories/comment.repository", () => ({
  createComment: vi.fn(),
  findCommentById: vi.fn(),
  deleteComment: vi.fn(),
  findCommentsByPostId: vi.fn(),
}));
vi.mock("@/lib/repositories/post.repository", () => ({
  findPostAuthorId: vi.fn(),
}));
vi.mock("@/lib/services/notification.service", () => ({
  createCommentNotification: vi.fn(),
}));

import { createComment, findCommentById, deleteComment, findCommentsByPostId } from "@/lib/repositories/comment.repository";
import { findPostAuthorId } from "@/lib/repositories/post.repository";
import { createCommentNotification } from "@/lib/services/notification.service";
import {
  findCommentsByPostIdService,
  createCommentService,
  deleteCommentService,
} from "@/lib/services/comment.service";

const USER_ID = "user-1";
const POST_AUTHOR_ID = "author-1";
const OTHER_USER_ID = "other-user-2";
const POST_ID = "post-1";
const COMMENT_ID = "comment-1";

describe("findCommentsByPostIdService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("引数をそのままrepositoryに渡し結果を返す", async () => {
    vi.mocked(findCommentsByPostId).mockResolvedValue({ comments: [], nextCursor: null, hasMore: false });

    const result = await findCommentsByPostIdService({ postId: POST_ID, cursor: "c1", limit: 10 });

    expect(findCommentsByPostId).toHaveBeenCalledWith({ postId: POST_ID, cursor: "c1", limit: 10 });
    expect(result).toEqual({ comments: [], nextCursor: null, hasMore: false });
  });
});

describe("createCommentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("投稿者と異なるユーザーがコメント_通知が生成される", async () => {
    vi.mocked(createComment).mockResolvedValue({ id: COMMENT_ID } as never);
    vi.mocked(findPostAuthorId).mockResolvedValue(POST_AUTHOR_ID);

    await createCommentService(USER_ID, POST_ID, "コメント本文");

    expect(createComment).toHaveBeenCalledWith({ postId: POST_ID, authorId: USER_ID, body: "コメント本文" });
    expect(createCommentNotification).toHaveBeenCalledWith(USER_ID, POST_AUTHOR_ID, POST_ID, "コメント本文");
  });

  it("投稿の著者が見つからない_通知は生成されない", async () => {
    vi.mocked(createComment).mockResolvedValue({ id: COMMENT_ID } as never);
    vi.mocked(findPostAuthorId).mockResolvedValue(null);

    await createCommentService(USER_ID, POST_ID, "コメント本文");

    expect(createCommentNotification).not.toHaveBeenCalled();
  });

  it("作成されたコメントを返す", async () => {
    vi.mocked(createComment).mockResolvedValue({ id: COMMENT_ID, body: "コメント本文" } as never);
    vi.mocked(findPostAuthorId).mockResolvedValue(POST_AUTHOR_ID);

    const result = await createCommentService(USER_ID, POST_ID, "コメント本文");

    expect(result).toEqual({ id: COMMENT_ID, body: "コメント本文" });
  });
});

describe("deleteCommentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在しないコメントID_NotFoundError", async () => {
    vi.mocked(findCommentById).mockResolvedValue(null);

    await expect(deleteCommentService(USER_ID, COMMENT_ID)).rejects.toThrow(NotFoundError);
    expect(deleteComment).not.toHaveBeenCalled();
  });

  it("コメント本人でも投稿オーナーでもない_ForbiddenError", async () => {
    vi.mocked(findCommentById).mockResolvedValue({
      authorId: POST_AUTHOR_ID,
      post: { authorId: POST_AUTHOR_ID },
    } as never);

    await expect(deleteCommentService(OTHER_USER_ID, COMMENT_ID)).rejects.toThrow(ForbiddenError);
    expect(deleteComment).not.toHaveBeenCalled();
  });

  it("コメント本人_削除される", async () => {
    vi.mocked(findCommentById).mockResolvedValue({
      authorId: USER_ID,
      postId: POST_ID,
      post: { authorId: POST_AUTHOR_ID },
    } as never);
    vi.mocked(deleteComment).mockResolvedValue({} as never);

    await deleteCommentService(USER_ID, COMMENT_ID);

    expect(deleteComment).toHaveBeenCalledWith(COMMENT_ID, POST_ID);
  });

  it("投稿オーナー本人_他人のコメントでも削除できる", async () => {
    vi.mocked(findCommentById).mockResolvedValue({
      authorId: OTHER_USER_ID,
      postId: POST_ID,
      post: { authorId: POST_AUTHOR_ID },
    } as never);
    vi.mocked(deleteComment).mockResolvedValue({} as never);

    await deleteCommentService(POST_AUTHOR_ID, COMMENT_ID);

    expect(deleteComment).toHaveBeenCalledWith(COMMENT_ID, POST_ID);
  });
});
