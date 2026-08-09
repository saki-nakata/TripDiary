import { describe, it, expect, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

vi.mock("@/lib/auth", () => ({
  auth: (handler: unknown) => handler,
}));

const { config } = await import("@/proxy");

describe("proxy matcher", () => {
  const matches = (pathname: string) =>
    unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `http://localhost${pathname}` });

  it("twemoji_不一致（middlewareから除外される）", () => {
    expect(matches("/twemoji/1f4cd.svg")).toBe(false);
  });

  it("twemoji類似の架空ページ_前方一致で巻き込まれず一致する（末尾スラッシュの検証）", () => {
    expect(matches("/twemoji-guide")).toBe(true);
    expect(matches("/twemojis")).toBe(true);
  });

  it("api_不一致", () => {
    expect(matches("/api/posts/portal")).toBe(false);
  });

  it("next静的アセット_不一致", () => {
    expect(matches("/_next/static/chunks/main.js")).toBe(false);
    expect(matches("/_next/image?url=x&w=384&q=75")).toBe(false);
  });

  it("favicon_不一致", () => {
    expect(matches("/favicon.ico")).toBe(false);
  });

  it("保護ルート_一致（素通りしないこと）", () => {
    expect(matches("/mypage")).toBe(true);
    expect(matches("/posts/new")).toBe(true);
    expect(matches("/settings")).toBe(true);
    expect(matches("/plans/1")).toBe(true);
    expect(matches("/posts/abc/edit")).toBe(true);
  });

  it("公開ルート_一致", () => {
    expect(matches("/")).toBe(true);
    expect(matches("/posts/abc")).toBe(true);
    expect(matches("/search")).toBe(true);
  });
});
