// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SavedMapSection } from "@/components/posts/SavedMapSection";
import { ToastProvider } from "@/contexts/toast-context";
import type { Post } from "@/types/post";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

function makePost(id: string, location: string): Post {
  return {
    id,
    title: `投稿${id}`,
    body: "本文",
    location,
    category: "観光",
    rating: null,
    visitedAt: "2026-01-01T00:00:00.000Z",
    cost: null,
    costBreakdown: null,
    lat: null,
    lng: null,
    planId: null,
    authorId: "author-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    author: { id: "author-1", nickname: "たろう", image: null },
    images: [],
    _count: { likes: 0, comments: 0 },
  };
}

function renderSection(posts: Post[]) {
  render(
    <ToastProvider>
      <SavedMapSection posts={posts} kind="wishlist" />
    </ToastProvider>
  );
}

async function removeCard(cardTitle: string) {
  const user = userEvent.setup();
  const card = screen.getByText(cardTitle).closest(".group\\/saved") as HTMLElement;
  await user.click(within(card).getByRole("button", { name: "行きたいから外す" }));
  await user.click(screen.getByRole("button", { name: "外す" }));
}

describe("SavedMapSection", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ─── 楽観的UIの反映範囲（カード除去と同時に県グループの件数見出しも更新されるか） ───
  it("外すボタンで成功したら、カードだけでなく県グループの件数見出しも即座に減る", async () => {
    const posts = [makePost("p1", "東京都"), makePost("p2", "東京都")];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    renderSection(posts);

    expect(screen.getByText("（2件）")).toBeInTheDocument();

    await removeCard("投稿p1");

    await waitFor(() => expect(screen.queryByText("投稿p1")).not.toBeInTheDocument());
    expect(screen.getByText("（1件）")).toBeInTheDocument();
  });

  it("外すボタンでAPIが失敗したら、カードと件数見出しの両方が元に戻る", async () => {
    const posts = [makePost("p1", "東京都"), makePost("p2", "東京都")];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    renderSection(posts);

    await removeCard("投稿p1");

    // ロールバック後、カードと件数表示がともに元通りになる
    await waitFor(() => expect(screen.getByText("投稿p1")).toBeInTheDocument());
    expect(screen.getByText("（2件）")).toBeInTheDocument();
  });

  it("グループ内の最後の1件を外すと、その県の見出し自体が消える", async () => {
    const posts = [makePost("p1", "東京都")];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    renderSection(posts);

    await removeCard("投稿p1");

    await waitFor(() => expect(screen.queryByText("東京都")).not.toBeInTheDocument());
  });
});
