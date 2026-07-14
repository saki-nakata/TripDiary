import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/notification.repository", () => ({
  createNotification: vi.fn(),
  findNotificationByLike: vi.fn(),
  findUserNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markStaleNotificationsAsRead: vi.fn(),
}));

import {
  findUserNotifications,
  getUnreadCount,
  markStaleNotificationsAsRead,
} from "@/lib/repositories/notification.repository";
import {
  getUserNotifications,
  getUnreadCountService,
  __resetStaleSweepThrottleForTests,
} from "@/lib/services/notification.service";

const USER_ID = "user-1";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const TOLERANCE_MS = 60_000; // テスト実行の遅延を許容する誤差

describe("通知の1年保持ポリシー（削除はせず、古い未読を既読化する）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetStaleSweepThrottleForTests();
  });

  it("getUserNotifications_一覧取得前に1年以上前の未読通知を既読化する", async () => {
    vi.mocked(findUserNotifications).mockResolvedValue([]);

    const before = Date.now();
    await getUserNotifications(USER_ID);

    expect(markStaleNotificationsAsRead).toHaveBeenCalledTimes(1);
    const [calledUserId, cutoff] = vi.mocked(markStaleNotificationsAsRead).mock.calls[0];
    expect(calledUserId).toBe(USER_ID);
    expect(cutoff).toBeInstanceOf(Date);
    expect(before - (cutoff as Date).getTime()).toBeGreaterThanOrEqual(ONE_YEAR_MS - TOLERANCE_MS);
    expect(before - (cutoff as Date).getTime()).toBeLessThanOrEqual(ONE_YEAR_MS + TOLERANCE_MS);

    // 既読化を先に行ってから一覧を取得する順序であること
    expect(vi.mocked(markStaleNotificationsAsRead).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(findUserNotifications).mock.invocationCallOrder[0]
    );
  });

  it("getUnreadCountService_件数取得前に1年以上前の未読通知を既読化し、バッジ対象から除外する", async () => {
    vi.mocked(getUnreadCount).mockResolvedValue(3);

    const count = await getUnreadCountService(USER_ID);

    expect(markStaleNotificationsAsRead).toHaveBeenCalledWith(USER_ID, expect.any(Date));
    expect(vi.mocked(markStaleNotificationsAsRead).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getUnreadCount).mock.invocationCallOrder[0]
    );
    expect(count).toBe(3);
  });

  it("getUnreadCountService_同一ユーザーの短時間の連続呼び出しでは既読化を間引く（バッジポーリング対策）", async () => {
    vi.mocked(getUnreadCount).mockResolvedValue(0);

    await getUnreadCountService(USER_ID);
    await getUnreadCountService(USER_ID);
    await getUnreadCountService(USER_ID);

    // 直近の実行から間隔が空いていないため、既読化は初回の1回のみ
    expect(markStaleNotificationsAsRead).toHaveBeenCalledTimes(1);
    // 件数取得自体は間引かれず毎回実行される
    expect(getUnreadCount).toHaveBeenCalledTimes(3);
  });

  it("getUnreadCountService_ユーザーが異なれば間引かれず、それぞれ既読化される", async () => {
    vi.mocked(getUnreadCount).mockResolvedValue(0);

    await getUnreadCountService(USER_ID);
    await getUnreadCountService("user-2");

    expect(markStaleNotificationsAsRead).toHaveBeenCalledTimes(2);
  });
});
