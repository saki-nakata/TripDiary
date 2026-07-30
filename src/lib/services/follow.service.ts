import { toggleFollow, findFollowers, findFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";
import { createFollowNotification } from "@/lib/services/notification.service";
import { ValidationError } from "@/lib/errors";

type FollowUser = { id: string; nickname: string; image: string | null; bio: string | null };

async function withFollowedByCurrentUser(
  result: { users: FollowUser[]; nextCursor: string | null; hasMore: boolean },
  viewerId?: string
) {
  if (!viewerId) {
    return { ...result, users: result.users.map((u) => ({ ...u, followedByCurrentUser: false })) };
  }
  const followingIds = await findFollowingIdsAmong(
    viewerId,
    result.users.map((u) => u.id)
  );
  const followingSet = new Set(followingIds);
  return { ...result, users: result.users.map((u) => ({ ...u, followedByCurrentUser: followingSet.has(u.id) })) };
}

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

export async function findFollowersService(params: { userId: string; viewerId?: string; cursor?: string; limit?: number }) {
  const { viewerId, ...rest } = params;
  const result = await findFollowers(rest);
  return withFollowedByCurrentUser(result, viewerId);
}

export async function findFollowingService(params: { userId: string; viewerId?: string; cursor?: string; limit?: number }) {
  const { viewerId, ...rest } = params;
  const result = await findFollowing(rest);
  return withFollowedByCurrentUser(result, viewerId);
}

export async function findFollowingIdsAmongService(viewerId: string, userIds: string[]) {
  return findFollowingIdsAmong(viewerId, userIds);
}
