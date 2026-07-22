import { toggleFollow, findFollowers, findFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";
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

export async function findFollowersService(userId: string) {
  return findFollowers(userId);
}

export async function findFollowingService(userId: string) {
  return findFollowing(userId);
}

export async function findFollowingIdsAmongService(viewerId: string, userIds: string[]) {
  return findFollowingIdsAmong(viewerId, userIds);
}
