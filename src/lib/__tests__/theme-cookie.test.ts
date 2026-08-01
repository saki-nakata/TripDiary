import { describe, it, expect } from "vitest";
import {
  parseThemeCookie,
  buildThemeCookieOptionsForResponse,
  buildThemeCookieStringForClient,
  THEME_COOKIE_NAME,
  THEME_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/theme-cookie";

describe("parseThemeCookie", () => {
  it.each(["light", "dark", "system"] as const)("正常値 %s はそのまま返す", (value) => {
    expect(parseThemeCookie(value)).toBe(value);
  });

  it("未設定(undefined)はsystemを返す", () => {
    expect(parseThemeCookie(undefined)).toBe("system");
  });

  it("null相当はsystemを返す", () => {
    expect(parseThemeCookie(null)).toBe("system");
  });

  it("不正な値はsystemを返す", () => {
    expect(parseThemeCookie("invalid-value")).toBe("system");
  });

  it("空文字はsystemを返す", () => {
    expect(parseThemeCookie("")).toBe("system");
  });
});

describe("buildThemeCookieOptionsForResponse", () => {
  it("httpOnlyは常にfalse（クライアントのdocument.cookieから読み書きする契約のため）", () => {
    expect(buildThemeCookieOptionsForResponse(false).httpOnly).toBe(false);
    expect(buildThemeCookieOptionsForResponse(true).httpOnly).toBe(false);
  });

  it("isHttps=falseの場合secureはfalse（現行HTTP運用）", () => {
    expect(buildThemeCookieOptionsForResponse(false).secure).toBe(false);
  });

  it("isHttps=trueの場合secureはtrue（本番HTTPS導入時）", () => {
    expect(buildThemeCookieOptionsForResponse(true).secure).toBe(true);
  });

  it("path・sameSite・maxAgeが仕様どおり", () => {
    const options = buildThemeCookieOptionsForResponse(false);
    expect(options.path).toBe("/");
    expect(options.sameSite).toBe("lax");
    expect(options.maxAge).toBe(THEME_COOKIE_MAX_AGE_SECONDS);
  });
});

describe("buildThemeCookieStringForClient", () => {
  it("Cookie名と値を含む", () => {
    expect(buildThemeCookieStringForClient("dark", false)).toContain(`${THEME_COOKIE_NAME}=dark`);
  });

  it("isHttps=falseの場合secure属性を含まない", () => {
    expect(buildThemeCookieStringForClient("light", false)).not.toContain("secure");
  });

  it("isHttps=trueの場合secure属性を含む", () => {
    expect(buildThemeCookieStringForClient("light", true)).toContain("secure");
  });

  it("path=/とsamesite=laxを含む", () => {
    const result = buildThemeCookieStringForClient("system", false);
    expect(result).toContain("path=/");
    expect(result).toContain("samesite=lax");
  });
});
