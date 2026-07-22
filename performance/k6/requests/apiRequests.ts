import http from "k6/http";
import { check } from "k6";
import { BASE_URL, TIMEOUT } from "../config/config.ts";
import type { RequestHeaders } from "../helpers/auth.ts";

export function getExplorePosts(headers: RequestHeaders, sort: "latest" | "popular" = "latest") {
  const res = http.get(`${BASE_URL}/api/posts/explore?limit=20&sort=${sort}`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "posts_explore" },
  });
  check(res, { "getExplorePosts: status 200": (r) => r.status === 200 });
  return res;
}

export function getPortalData(headers: RequestHeaders) {
  const res = http.get(`${BASE_URL}/api/posts/portal`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "posts_portal" },
  });
  check(res, { "getPortalData: status 200": (r) => r.status === 200 });
  return res;
}

export function getUnreadCount(headers: RequestHeaders) {
  const res = http.get(`${BASE_URL}/api/notifications/unread-count`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "notifications_unread_count" },
  });
  check(res, { "getUnreadCount: status 200": (r) => r.status === 200 });
  return res;
}

export function toggleLikeRequest(headers: RequestHeaders, postId: string) {
  const res = http.post(`${BASE_URL}/api/posts/${postId}/like`, null, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "posts_like_toggle" },
  });
  check(res, { "toggleLikeRequest: status 200": (r) => r.status === 200 });
  return res;
}

export function getComments(headers: RequestHeaders, postId: string) {
  const res = http.get(`${BASE_URL}/api/posts/${postId}/comments?limit=20`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "posts_comments_list" },
  });
  check(res, { "getComments: status 200": (r) => r.status === 200 });
  return res;
}

export function postComment(headers: RequestHeaders, postId: string, body: string) {
  const res = http.post(`${BASE_URL}/api/posts/${postId}/comments`, JSON.stringify({ body }), {
    headers: { ...headers, "Content-Type": "application/json" },
    timeout: TIMEOUT,
    tags: { endpoint: "posts_comments_create" },
  });
  check(res, { "postComment: status 201": (r) => r.status === 201 });
  return res;
}

export function toggleFollowRequest(headers: RequestHeaders, userId: string) {
  const res = http.post(`${BASE_URL}/api/users/${userId}/follow`, null, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "users_follow_toggle" },
  });
  check(res, { "toggleFollowRequest: status 200": (r) => r.status === 200 });
  return res;
}

export function getStats(headers: RequestHeaders, year: string = "all") {
  const res = http.get(`${BASE_URL}/api/stats?year=${year}`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "stats" },
  });
  check(res, { "getStats: status 200": (r) => r.status === 200 });
  return res;
}

export function getStatsYears(headers: RequestHeaders) {
  const res = http.get(`${BASE_URL}/api/stats/years`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "stats_years" },
  });
  check(res, { "getStatsYears: status 200": (r) => r.status === 200 });
  return res;
}

export function getPlans(headers: RequestHeaders) {
  const res = http.get(`${BASE_URL}/api/plans`, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "plans_list" },
  });
  check(res, { "getPlans: status 200": (r) => r.status === 200 });
  return res;
}

export function createPlan(headers: RequestHeaders, title: string) {
  const res = http.post(`${BASE_URL}/api/plans`, JSON.stringify({ title, spots: [] }), {
    headers: { ...headers, "Content-Type": "application/json" },
    timeout: TIMEOUT,
    tags: { endpoint: "plans_create" },
  });
  check(res, { "createPlan: status 201": (r) => r.status === 201 });
  return res;
}

export function deletePlan(headers: RequestHeaders, planId: string) {
  const res = http.del(`${BASE_URL}/api/plans/${planId}`, null, {
    headers,
    timeout: TIMEOUT,
    tags: { endpoint: "plans_delete" },
  });
  check(res, { "deletePlan: status 200": (r) => r.status === 200 });
  return res;
}
