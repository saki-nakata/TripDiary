import type { ThemeChoice } from "@/components/ui/theme";

export const THEME_COOKIE_NAME = "theme";
// 400日（Chromeが許容するCookie有効期限の実質上限）
export const THEME_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function parseThemeCookie(value: string | undefined | null): ThemeChoice {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

// サーバー側（Route Handlerのレスポンス）用オプション。NextResponseのcookies.set()へ
// そのまま渡す想定。httpOnly:falseは明示（ThemeProviderがdocument.cookieから
// 読み書きする契約のため必須。省略時のNext.jsデフォルトもfalseだが暗黙に頼らない）
export function buildThemeCookieOptionsForResponse(isHttps: boolean) {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge: THEME_COOKIE_MAX_AGE_SECONDS,
    httpOnly: false,
    secure: isHttps,
  };
}

// クライアント側（ThemeProviderがdocument.cookieへ直接書く経路）用。
// サーバー用のNextResponse cookie APIとは形が異なるため、document.cookie文字列を
// 別途組み立てる（属性値はTHEME_COOKIE_MAX_AGE_SECONDS等をここでも共有する）
export function buildThemeCookieStringForClient(value: ThemeChoice, isHttps: boolean): string {
  const attrs = [
    `${THEME_COOKIE_NAME}=${value}`,
    "path=/",
    `max-age=${THEME_COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
  ];
  if (isHttps) attrs.push("secure");
  return attrs.join("; ");
}
