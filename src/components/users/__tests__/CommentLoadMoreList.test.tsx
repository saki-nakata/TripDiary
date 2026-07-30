// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommentLoadMoreList, type AuthorComment } from "@/components/users/CommentLoadMoreList";

function makeComment(id: string, body: string): AuthorComment {
  return {
    id,
    body,
    postId: "post-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    author: { id: "author-1", nickname: "投稿者", image: null },
    post: { id: "post-1", title: "投稿タイトル", images: [], author: { id: "author-1", nickname: "投稿者", image: null } },
  };
}

describe("CommentLoadMoreList（GATE-22種類B: 継続取得の共通UI導線）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hasMoreがfalse_もっと見るボタンが表示されない", () => {
    render(
      <CommentLoadMoreList
        initialComments={[makeComment("c1", "コメントA")]}
        initialNextCursor={null}
        initialHasMore={false}
        baseUrl="/api/users/author-1/comments"
        variant="written"
      />
    );

    expect(screen.queryByRole("button", { name: "もっと見る" })).not.toBeInTheDocument();
  });

  it("もっと見るをクリック_追加取得したコメントが末尾に追記される", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ comments: [makeComment("c2", "コメントB")], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <CommentLoadMoreList
        initialComments={[makeComment("c1", "コメントA")]}
        initialNextCursor="c1"
        initialHasMore={true}
        baseUrl="/api/users/author-1/comments"
        variant="written"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "もっと見る" }));

    await waitFor(() => expect(screen.getByText("コメントB")).toBeInTheDocument());
    expect(screen.getByText("コメントA")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/users/author-1/comments?cursor=c1");
    expect(screen.queryByRole("button", { name: "もっと見る" })).not.toBeInTheDocument();
  });
});
