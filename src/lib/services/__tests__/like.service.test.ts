import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/repositories/like.repository", () => ({
  toggleLike: vi.fn(),
}));
vi.mock("@/lib/repositories/post.repository", () => ({
  findPostAuthorId: vi.fn(),
}));
vi.mock("@/lib/services/notification.service", () => ({
  createLikeNotification: vi.fn(),
}));

import { toggleLike } from "@/lib/repositories/like.repository";
import { findPostAuthorId } from "@/lib/repositories/post.repository";
import { createLikeNotification } from "@/lib/services/notification.service";
import { toggleLikeService } from "@/lib/services/like.service";

const USER_ID = "user-1";
const AUTHOR_ID = "author-1";
const POST_ID = "post-1";

describe("toggleLikeService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── toggleLike ───
  it("toggleLike_いいねON_通知が作成される", async () => {
    vi.mocked(toggleLike).mockResolvedValue({ liked: true });
    vi.mocked(findPostAuthorId).mockResolvedValue(AUTHOR_ID);

    const result = await toggleLikeService(USER_ID, POST_ID);

    expect(result).toEqual({ liked: true });
    expect(createLikeNotification).toHaveBeenCalledWith(USER_ID, AUTHOR_ID, POST_ID);
  });

  it("toggleLike_いいねOFF_通知は作成されない", async () => {
    vi.mocked(toggleLike).mockResolvedValue({ liked: false });
    vi.mocked(findPostAuthorId).mockResolvedValue(AUTHOR_ID);

    await toggleLikeService(USER_ID, POST_ID);

    expect(createLikeNotification).not.toHaveBeenCalled();
  });

  it("toggleLike_投稿の著者が見つからない_通知は作成されない", async () => {
    vi.mocked(toggleLike).mockResolvedValue({ liked: true });
    vi.mocked(findPostAuthorId).mockResolvedValue(null);

    await toggleLikeService(USER_ID, POST_ID);

    expect(createLikeNotification).not.toHaveBeenCalled();
  });

  it("toggleLike_自分の投稿_ForbiddenErrorを投げてtoggleLikeは呼ばれない", async () => {
    vi.mocked(findPostAuthorId).mockResolvedValue(USER_ID);

    await expect(toggleLikeService(USER_ID, POST_ID)).rejects.toThrow(ForbiddenError);
    expect(toggleLike).not.toHaveBeenCalled();
  });
});
