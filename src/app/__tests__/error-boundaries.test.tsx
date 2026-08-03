// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RootError from "@/app/error";
import AppSegmentError from "@/app/(app)/error";
import AuthSegmentError from "@/app/(auth)/error";
import PublicSegmentError from "@/app/(public)/error";

const boundaries = [
  ["root", RootError],
  ["app", AppSegmentError],
  ["auth", AuthSegmentError],
  ["public", PublicSegmentError],
] as const;

describe("セグメントError Boundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each(boundaries)("%sはダークテーマ対応のエラー画面と再試行操作を描画する", (_name, Boundary) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    const { container } = render(<Boundary error={new Error("boundary test")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "旅の途中で小さなトラブルが発生しました" })).toHaveClass(
      "text-surface-foreground"
    );
    expect(container.querySelector('[class*="dark:bg-amber-950"]')).toBeInTheDocument();
    expect(container.querySelector("p")).toHaveClass("dark:text-zinc-400");

    fireEvent.click(screen.getByRole("button", { name: /再試行する/ }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
