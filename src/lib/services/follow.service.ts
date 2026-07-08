import { toggleFollow } from "@/lib/repositories/follow.repository";
import { createFollowNotification } from "@/lib/services/notification.service";
import { ValidationError } from "@/lib/errors";

export async function toggleFollowService(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new ValidationError("自分自身をフォローすることはできません");
  }

  const result = await toggleFollow(followerId, followingId);

  if (result.following) {
    await createFollowNotification(followerId, followingId);
  }

  return result;
}
