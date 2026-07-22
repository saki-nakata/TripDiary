// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/contexts/toast-context";
import { LikeButton } from "@/components/posts/LikeButton";
import { WishlistButton } from "@/components/posts/WishlistButton";
import { VisitedButton } from "@/components/posts/VisitedButton";
import { FollowButton } from "@/components/users/FollowButton";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/posts/post-1",
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithToast(component: React.ReactNode) {
  render(<ToastProvider>{component}</ToastProvider>);
}

function deferredResponse() {
  let reject!: (reason?: unknown) => void;
  const response = new Promise<Response>((_, rejectPromise) => {
    reject = rejectPromise;
  });
  return { response, reject };
}

describe("楽観的更新ボタン", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("LikeButton_API失敗時に状態と件数をロールバックする", async () => {
    const { response, reject } = deferredResponse();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(response));
    renderWithToast(<LikeButton postId="post-1" initialLiked={false} initialCount={3} isLoggedIn />);

    fireEvent.click(screen.getByTestId("like-button"));
    expect(screen.getByTestId("like-count")).toHaveTextContent("4");
    reject(new Error("network error"));

    await waitFor(() => expect(screen.getByTestId("like-count")).toHaveTextContent("3"));
  });

  it("WishlistButton_API失敗時に状態をロールバックする", async () => {
    const { response, reject } = deferredResponse();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(response));
    renderWithToast(<WishlistButton postId="post-1" initialWishlisted={false} isLoggedIn />);

    fireEvent.click(screen.getByTitle("行きたいに追加"));
    expect(screen.getByTitle("行きたいを解除")).toBeInTheDocument();
    reject(new Error("network error"));

    await waitFor(() => expect(screen.getByTitle("行きたいに追加")).toBeInTheDocument());
  });

  it("VisitedButton_API失敗時に状態をロールバックする", async () => {
    const { response, reject } = deferredResponse();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(response));
    renderWithToast(<VisitedButton postId="post-1" initialVisited={false} isLoggedIn />);

    fireEvent.click(screen.getByTitle("訪問済みにする"));
    expect(screen.getByTitle("訪問済みを解除")).toBeInTheDocument();
    reject(new Error("network error"));

    await waitFor(() => expect(screen.getByTitle("訪問済みにする")).toBeInTheDocument());
  });

  it("FollowButton_API失敗時に状態をロールバックする", async () => {
    const { response, reject } = deferredResponse();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(response));
    renderWithToast(<FollowButton userId="user-1" initialFollowing={false} isLoggedIn />);

    fireEvent.click(screen.getByTitle("フォローする"));
    expect(screen.getByTitle("フォローを解除")).toBeInTheDocument();
    reject(new Error("network error"));

    await waitFor(() => expect(screen.getByTitle("フォローする")).toBeInTheDocument());
  });
});
