import {
  createNotification,
  findNotificationByLike,
  findUserNotifications,
  getUnreadCount,
  markAsRead,
  markStaleNotificationsAsRead,
} from "@/lib/repositories/notification.repository";

// 通知は削除せず無期限保持する。1年以上経過して未読のまま放置された通知は、
// 一覧取得のたびに遅延的に既読化し、未読バッジの対象から外す（専用バッチ基盤は導入しない）。
const STALE_NOTIFICATION_DAYS = 365;

function staleNotificationCutoff() {
  return new Date(Date.now() - STALE_NOTIFICATION_DAYS * 24 * 60 * 60 * 1000);
}

// 未読バッジ（サイドバー）は60〜180秒間隔でポーリングされるため、取得のたびに毎回
// markStaleNotificationsAsRead（UPDATE）を発行すると、対象0件のときも無駄な書き込みが積み重なる。
// バッジ経路のみユーザー単位で間引き、通知一覧（ユーザー操作で開くページ）は常に最新化する。
const SWEEP_THROTTLE_MS = 12 * 60 * 60 * 1000; // 1ユーザーにつき12時間に1回まで
const lastSweptAt = new Map<string, number>();

async function sweepStaleNotificationsThrottled(userId: string) {
  const now = Date.now();
  const last = lastSweptAt.get(userId) ?? 0;
  if (now - last < SWEEP_THROTTLE_MS) return;
  lastSweptAt.set(userId, now);
  await markStaleNotificationsAsRead(userId, staleNotificationCutoff());
}

export function __resetStaleSweepThrottleForTests() {
  lastSweptAt.clear();
}

export async function createLikeNotification(fromUserId: string, postAuthorId: string, postId: string) {
  if (fromUserId === postAuthorId) return;
  const existing = await findNotificationByLike(postAuthorId, fromUserId, postId);
  if (existing) return;
  return createNotification({ userId: postAuthorId, fromUserId, type: "like", postId });
}

export async function deleteLikeNotification(fromUserId: string, postAuthorId: string, postId: string) {
  // いいね解除時は通知を削除しない（既読管理を優先）
  void fromUserId;
  void postAuthorId;
  void postId;
}

export async function createCommentNotification(
  fromUserId: string,
  postAuthorId: string,
  postId: string,
  commentBody: string
) {
  if (fromUserId === postAuthorId) return;
  return createNotification({
    userId: postAuthorId,
    fromUserId,
    type: "comment",
    postId,
    commentBody: commentBody.slice(0, 200),
  });
}

export async function createFollowNotification(fromUserId: string, targetUserId: string) {
  if (fromUserId === targetUserId) return;
  return createNotification({ userId: targetUserId, fromUserId, type: "follow" });
}

export async function getUserNotifications(userId: string) {
  await markStaleNotificationsAsRead(userId, staleNotificationCutoff());
  return findUserNotifications(userId);
}

export async function getUnreadCountService(userId: string) {
  await sweepStaleNotificationsThrottled(userId);
  return getUnreadCount(userId);
}

export async function markAsReadService(notificationId: string, userId: string) {
  return markAsRead(notificationId, userId);
}
