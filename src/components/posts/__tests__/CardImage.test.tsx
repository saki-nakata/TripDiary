// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CardImage } from "@/components/posts/CardImage";

describe("CardImage", () => {
  it("読み込み成功時は画像を表示しフォールバックは出さない", () => {
    render(<CardImage src="https://example.com/a.jpg" alt="投稿A" sizes="100px" />);
    expect(screen.getByRole("img", { name: "投稿A" })).toBeInTheDocument();
  });

  it("onError発火_未指定時は汎用プレースホルダに切り替わる", () => {
    render(<CardImage src="https://example.com/broken.jpg" alt="投稿A" sizes="100px" />);
    const img = screen.getByRole("img", { name: "投稿A" });

    fireEvent.error(img);

    expect(screen.queryByRole("img", { name: "投稿A" })).not.toBeInTheDocument();
    expect(document.querySelector('img[src="/twemoji/1f4f7.svg"]')).toBeInTheDocument();
  });

  it("onError発火_fallback指定時はfallbackの内容を表示する", () => {
    render(
      <CardImage
        src="https://example.com/broken.jpg"
        alt="投稿A"
        sizes="100px"
        fallback={<span data-testid="custom-fallback">カテゴリアイコン</span>}
      />
    );
    const img = screen.getByRole("img", { name: "投稿A" });

    fireEvent.error(img);

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
  });

  it("src変更時_エラー状態がリセットされ画像表示に復帰する", () => {
    const { rerender } = render(<CardImage src="https://example.com/broken.jpg" alt="投稿A" sizes="100px" />);
    fireEvent.error(screen.getByRole("img", { name: "投稿A" }));
    expect(screen.queryByRole("img", { name: "投稿A" })).not.toBeInTheDocument();

    rerender(<CardImage src="https://example.com/ok.jpg" alt="投稿A" sizes="100px" />);

    expect(screen.getByRole("img", { name: "投稿A" })).toBeInTheDocument();
  });
});
