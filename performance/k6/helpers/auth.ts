import http from "k6/http";
import { check } from "k6";
import { BASE_URL, TIMEOUT } from "../config/config.ts";

export type RequestHeaders = Record<string, string>;

// NextAuth v5 (Auth.js) の Credentials ログインフロー。
// 実測（curl -v）で確認済み: GET /api/auth/csrf → authjs.csrf-token を発行
// → POST /api/auth/callback/credentials（form-urlencoded, csrfTokenを含む）→ 302 + authjs.session-token。
// 以降の認証済みリクエストは Cookie: authjs.session-token=<value> のみで通る
// （authjs.csrf-token / authjs.callback-url は不要）。
export function login(email: string, password: string): RequestHeaders {
  // k6はデフォルトでVUごとの共有Cookieジャーを持ち、GET/POSTの前後でSet-Cookieを自動的に
  // 蓄積・付与する。setup()内でuserを1人ずつ順番にlogin()するとジャーに前のユーザーの
  // authjs.csrf-token/authjs.session-tokenが残ったまま次のユーザーのリクエストに紛れ込み、
  // サーバーが古いCSRFトークンを見てMissingCSRFエラーで弾く（実測で確認済み）。
  // Cookieは明示的にheadersで渡して手動管理しているため、ジャーの残留分は毎回クリアする。
  http.cookieJar().clear(BASE_URL);

  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, {
    timeout: TIMEOUT,
    tags: { endpoint: "auth_csrf" },
  });
  check(csrfRes, { "login: csrf status 200": (r) => r.status === 200 });

  const csrfBody = csrfRes.json() as { csrfToken?: string } | null;
  const csrfToken = csrfBody?.csrfToken ?? "";
  const csrfCookie = csrfRes.cookies["authjs.csrf-token"]?.[0]?.value ?? "";

  const loginRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    { email, password, csrfToken, json: "true" },
    {
      headers: { Cookie: `authjs.csrf-token=${csrfCookie}` },
      redirects: 0,
      timeout: TIMEOUT,
      tags: { endpoint: "login" },
    }
  );
  check(loginRes, { "login: callback status 302": (r) => r.status === 302 });

  const sessionToken = loginRes.cookies["authjs.session-token"]?.[0]?.value ?? "";
  // ステータス302は「認証成功」ではなく「リダイレクトが起きた」ことしか保証しない
  // （credentials不一致時もNextAuthは/login?error=...へ302する）。session-tokenの有無を
  // 明示的にチェックし、キャッシュ絡みの不具合等で無言のログイン失敗が埋もれないようにする。
  check(sessionToken, { "login: session-token cookie present": (t) => t.length > 0 });
  return { Cookie: `authjs.session-token=${sessionToken}` };
}
