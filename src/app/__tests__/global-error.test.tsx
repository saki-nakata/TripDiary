// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GlobalError from "@/app/global-error";

describe("GlobalError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("エラーをconsole.errorに記録する", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("致命的なエラー");

    render(<GlobalError error={error} reset={vi.fn()} />);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });

  it("再試行ボタンのクリックでresetが呼ばれる", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const resetMock = vi.fn();
    const error = new Error("致命的なエラー");

    render(<GlobalError error={error} reset={resetMock} />);
    fireEvent.click(screen.getByText("再試行する"));

    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});
