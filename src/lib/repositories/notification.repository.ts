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

export async function findUserNotifications(userId: string, limit = 50) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: NOTIFICATION_SELECT,
  });
  return notifications.map((n) => ({
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  }));
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
