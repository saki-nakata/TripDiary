// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GlobalError from "@/app/global-error";

describe("GlobalError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.cookie = "theme=; max-age=0; path=/";
    document.documentElement.removeAttribute("data-theme");
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

  it.each([
    ["dark", "dark"],
    ["light", "light"],
    ["system", null],
    ["不正値", null],
  ] as const)("Cookieが%sのときdata-themeを%pにする", async (cookieValue, expectedTheme) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    document.cookie = `theme=${encodeURIComponent(cookieValue)}; path=/`;

    const { container } = render(<GlobalError error={new Error("theme test")} reset={vi.fn()} />);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe(expectedTheme);
    });
    expect(container.querySelector('[class*="dark:bg-red-950"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /再試行する/ })).toHaveClass("bg-red-600");
  });
});
