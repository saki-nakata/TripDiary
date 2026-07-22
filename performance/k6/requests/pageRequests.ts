import http from "k6/http";
import { check } from "k6";
import { BASE_URL, TIMEOUT } from "../config/config.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

// SSRページはstatus 200だけでは「正しいページが返っているか」を保証しない
// （将来middlewareでログインへのリダイレクトを追加した場合、リダイレクト先を200として
// 誤検知する恐れがある）。本文に必ず含まれるはずのマーカー文字列も併せて検証する。

export function getHomePage(headers: RequestHeaders) {
  const res = http.get(`${BASE_URL}/`, { headers, timeout: TIMEOUT, tags: { endpoint: "home_ssr" } });
  check(res, {
    "getHomePage: status 200": (r) => r.status === 200,
    "getHomePage: body contains marker": (r) => (r.body as string)?.includes("人気の旅スポット") ?? false,
  });
  return res;
}

export function getPostDetailPage(headers: RequestHeaders, postId: string) {
  const res = http.get(`${BASE_URL}/posts/${postId}`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "post_detail_ssr" },
  });
  check(res, {
    "getPostDetailPage: status 200": (r) => r.status === 200,
    "getPostDetailPage: body contains marker": (r) => (r.body as string)?.includes("コメント") ?? false,
  });
  return res;
}

export function getMypageReportPage(headers: RequestHeaders) {
  const res = http.get(`${BASE_URL}/mypage?tab=report`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "mypage_report_ssr" },
  });
  check(res, {
    "getMypageReportPage: status 200": (r) => r.status === 200,
    "getMypageReportPage: body contains marker": (r) => (r.body as string)?.includes("投稿数") ?? false,
  });
  return res;
}

export function getUserProfilePage(headers: RequestHeaders, userId: string) {
  const res = http.get(`${BASE_URL}/users/${userId}`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "user_profile_ssr" },
  });
  check(res, {
    "getUserProfilePage: status 200": (r) => r.status === 200,
    "getUserProfilePage: body contains marker": (r) => (r.body as string)?.includes("フォロワー") ?? false,
  });
  return res;
}
