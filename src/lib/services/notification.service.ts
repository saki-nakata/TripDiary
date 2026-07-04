import {
  createNotification,
  findNotificationByLike,
  findUserNotifications,
  getUnreadCount,
  markAsRead,
} from "@/lib/repositories/notification.repository";

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
  return findUserNotifications(userId);
}

export async function getUnreadCountService(userId: string) {
  return getUnreadCount(userId);
}

export async function markAsReadService(notificationId: string, userId: string) {
  return markAsRead(notificationId, userId);
}
