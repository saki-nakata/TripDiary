import { prisma } from "@/lib/prisma";

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  postId: true,
  commentBody: true,
  read: true,
  createdAt: true,
  fromUser: {
    select: { id: true, nickname: true, image: true },
  },
} as const;

export async function createNotification(data: {
  userId: string;
  fromUserId: string;
  type: "like" | "comment" | "follow";
  postId?: string;
  commentBody?: string;
}) {
  return prisma.notification.create({ data });
}

export async function findNotificationByLike(userId: string, fromUserId: string, postId: string) {
  return prisma.notification.findFirst({
    where: { userId, fromUserId, type: "like", postId },
  });
}

export async function findUserNotifications({
  userId,
  cursor,
  limit = 20,
}: {
  userId: string;
  cursor?: string;
  limit?: number;
}) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], // idタイブレーカーで全順序を保証（GATE-22種類A）
    select: NOTIFICATION_SELECT,
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, limit) : notifications;
  return {
    notifications: items.map((n) => ({
      ...n,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markStaleNotificationsAsRead(userId: string, olderThan: Date) {
  return prisma.notification.updateMany({
    where: { userId, read: false, createdAt: { lt: olderThan } },
    data: { read: true },
  });
}
