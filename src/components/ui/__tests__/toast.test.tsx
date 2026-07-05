// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastContainer } from "@/components/ui/toast";

describe("ToastContainer", () => {
  // ─── render ───
  it("render_トーストが空_何も表示されない", () => {
    const { container } = render(<ToastContainer toasts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("render_successトースト_メッセージが表示される", () => {
    render(<ToastContainer toasts={[{ id: 1, message: "投稿しました！", type: "success" }]} />);
    expect(screen.getByText("投稿しました！")).toBeInTheDocument();
  });

  it("render_複数トースト_すべて表示される", () => {
    render(
      <ToastContainer
        toasts={[
          { id: 1, message: "1件目", type: "success" },
          { id: 2, message: "2件目", type: "error" },
        ]}
      />
    );
    expect(screen.getByText("1件目")).toBeInTheDocument();
    expect(screen.getByText("2件目")).toBeInTheDocument();
  });
});
