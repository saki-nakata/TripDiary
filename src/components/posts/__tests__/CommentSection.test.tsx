// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/contexts/toast-context";
import { CommentSection } from "@/components/posts/CommentSection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const POST_ID = "post-1";
const USER_ID = "user-1";
const SAVED_COMMENT = {
  id: "comment-1",
  body: "新しいコメント",
  createdAt: new Date().toISOString(),
  author: { id: USER_ID, nickname: "たろう", image: null },
};

function renderCommentSection() {
  render(
    <ToastProvider>
      <CommentSection postId={POST_ID} currentUserId={USER_ID} postAuthorId="author-1" />
    </ToastProvider>
  );
}

describe("CommentSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 競合状態（初回GETが投稿より後に解決するケース） ───
  it("投稿完了後に初回一覧取得(GET)が遅れて解決しても、投稿したコメントが消えない", async () => {
    let resolveInitialGet!: (value: unknown) => void;
    const initialGetPromise = new Promise((resolve) => {
      resolveInitialGet = resolve;
    });

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => SAVED_COMMENT });
      }
      // 初回のGET（コメント一覧取得）はまだ解決しない
      return initialGetPromise as Promise<Response>;
    });
    vi.stubGlobal("fetch", fetchMock);

    renderCommentSection();

    // 初回GETがまだ解決していない状態（loading中）でコメントを投稿する
    fireEvent.change(screen.getByTestId("comment-textarea"), { target: { value: "新しいコメント" } });
    fireEvent.click(screen.getByRole("button", { name: "コメントを投稿" }));

    // POST（投稿）が完了するのを待つ。表示自体は初回GETが未解決のうちは「読み込み中...」のまま
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    // ここで初回GET（投稿前に開始した古いリクエスト）が空のリストで解決する
    resolveInitialGet({ comments: [], nextCursor: null, hasMore: false });

    // 古いGETの結果で上書きされず、投稿したコメントが表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("新しいコメント")).toBeInTheDocument();
    });
    expect(screen.queryByText("まだコメントはありません。最初のコメントを投稿しましょう！")).not.toBeInTheDocument();
  });

  // ─── 未ログイン時の表示 ───
  it("未ログイン時_ログインするリンクが表示されコメント欄が表示されない", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ comments: [], nextCursor: null, hasMore: false }) }))
    );

    render(
      <ToastProvider>
        <CommentSection postId={POST_ID} currentUserId={undefined} postAuthorId="author-1" />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute("href", "/login");
    });
    expect(screen.queryByTestId("comment-textarea")).not.toBeInTheDocument();
  });
});
