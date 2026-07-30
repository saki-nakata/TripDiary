// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { UserLoadMoreList, type FollowListUser } from "@/components/users/UserLoadMoreList";

function makeUser(id: string, nickname: string): FollowListUser {
  return { id, nickname, image: null, bio: null, followedByCurrentUser: false };
}

describe("UserLoadMoreList（GATE-22種類B: 継続取得の共通UI導線）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hasMoreがfalse_もっと見るボタンが表示されない", () => {
    render(
      <UserLoadMoreList
        initialUsers={[makeUser("u1", "たろう")]}
        initialNextCursor={null}
        initialHasMore={false}
        baseUrl="/api/users/user-1/followers"
      />
    );

    expect(screen.queryByRole("button", { name: "もっと見る" })).not.toBeInTheDocument();
  });

  it("もっと見るをクリック_追加取得したユーザーが末尾に追記される", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: [makeUser("u2", "はなこ")], nextCursor: null, hasMore: false }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <UserLoadMoreList
        initialUsers={[makeUser("u1", "たろう")]}
        initialNextCursor="u1"
        initialHasMore={true}
        baseUrl="/api/users/user-1/followers"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "もっと見る" }));

    await waitFor(() => expect(screen.getByText("はなこ")).toBeInTheDocument());
    expect(screen.getByText("たろう")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/users/user-1/followers?cursor=u1");
    expect(screen.queryByRole("button", { name: "もっと見る" })).not.toBeInTheDocument();
  });
});
