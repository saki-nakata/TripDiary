import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createNotification,
  findNotificationByLike,
  findUserNotifications,
  getUnreadCount,
  markAsRead,
  markStaleNotificationsAsRead,
} from "@/lib/repositories/notification.repository";
import { createPost } from "@/lib/repositories/post.repository";

async function cleanDatabase() {
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  await prisma.notification.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function createTestUser(email: string, nickname: string) {
  return prisma.user.create({ data: { email, nickname, password: "hashed" } });
}

describe("notification.repository", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  // ─── createNotification / findUserNotifications ───
  it("createNotification_呼ぶ_通知が作成されfindUserNotificationsで取得できる", async () => {
    const recipient = await createTestUser("n1@example.com", "受信者");
    const sender = await createTestUser("n2@example.com", "送信者");
    const post = await createPost(sender.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });

    await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "like", postId: post.id });

    const notifications = await findUserNotifications(recipient.id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("like");
    expect(notifications[0].read).toBe(false);
  });

  it("findUserNotifications_通知なし_空配列を返す(境界値)", async () => {
    const user = await createTestUser("n3@example.com", "ユーザー");

    expect(await findUserNotifications(user.id)).toEqual([]);
  });

  // ─── findNotificationByLike ───
  it("findNotificationByLike_該当する通知がある_取得できる", async () => {
    const recipient = await createTestUser("n4@example.com", "受信者");
    const sender = await createTestUser("n5@example.com", "送信者");
    const post = await createPost(sender.id, { title: "投稿", body: "本文", location: "東京都", category: "観光", visitedAt: "2026-01-01" });
    await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "like", postId: post.id });

    const result = await findNotificationByLike(recipient.id, sender.id, post.id);

    expect(result).not.toBeNull();
  });

  it("findNotificationByLike_該当する通知がない_nullを返す(境界値)", async () => {
    const recipient = await createTestUser("n6@example.com", "受信者");
    const sender = await createTestUser("n7@example.com", "送信者");

    expect(await findNotificationByLike(recipient.id, sender.id, "nonexistent-post")).toBeNull();
  });

  // ─── getUnreadCount ───
  it("getUnreadCount_未読が2件_2を返す", async () => {
    const recipient = await createTestUser("n8@example.com", "受信者");
    const sender = await createTestUser("n9@example.com", "送信者");
    await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "follow" });
    await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "follow" });

    expect(await getUnreadCount(recipient.id)).toBe(2);
  });

  it("getUnreadCount_通知なし_0を返す(境界値)", async () => {
    const user = await createTestUser("n10@example.com", "ユーザー");

    expect(await getUnreadCount(user.id)).toBe(0);
  });

  // ─── markAsRead ───
  it("markAsRead_呼ぶ_readがtrueになりgetUnreadCountが減る", async () => {
    const recipient = await createTestUser("n11@example.com", "受信者");
    const sender = await createTestUser("n12@example.com", "送信者");
    const notification = await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "follow" });

    await markAsRead(notification.id, recipient.id);

    expect(await getUnreadCount(recipient.id)).toBe(0);
  });

  it("markAsRead_他人の通知IDを指定_更新されない", async () => {
    const recipient = await createTestUser("n13@example.com", "受信者");
    const other = await createTestUser("n14@example.com", "他人");
    const sender = await createTestUser("n15@example.com", "送信者");
    const notification = await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "follow" });

    await markAsRead(notification.id, other.id);

    expect(await getUnreadCount(recipient.id)).toBe(1);
  });

  // ─── markStaleNotificationsAsRead ───
  it("markStaleNotificationsAsRead_基準日より古い未読通知が既読になる", async () => {
    const recipient = await createTestUser("n16@example.com", "受信者");
    const sender = await createTestUser("n17@example.com", "送信者");
    const notification = await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "follow" });
    const oldDate = new Date("2020-01-01");
    await prisma.notification.update({ where: { id: notification.id }, data: { createdAt: oldDate } });

    await markStaleNotificationsAsRead(recipient.id, new Date("2025-01-01"));

    expect(await getUnreadCount(recipient.id)).toBe(0);
  });

  it("markStaleNotificationsAsRead_基準日より新しい未読通知は既読にしない(境界値)", async () => {
    const recipient = await createTestUser("n18@example.com", "受信者");
    const sender = await createTestUser("n19@example.com", "送信者");
    await createNotification({ userId: recipient.id, fromUserId: sender.id, type: "follow" });

    await markStaleNotificationsAsRead(recipient.id, new Date("2020-01-01"));

    expect(await getUnreadCount(recipient.id)).toBe(1);
  });
});
