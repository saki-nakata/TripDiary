import { compare } from "bcryptjs";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import {
  findUserById,
  updateUser as updateUserRepo,
  countUserPosts,
  countVisitedByUser,
  countLikesReceived,
  countCommentsReceived,
  computeTabiScoreInputsForUsers,
  searchUsersByNickname,
  findUserPasswordHash,
  updateUserPassword,
  findUserByEmail,
  findUserPasswordHashAndEmail,
  updateUserEmail,
} from "@/lib/repositories/user.repository";
import { isFollowing, findFollowingIdsAmong } from "@/lib/repositories/follow.repository";
import type { UserUpdateInput } from "@/lib/validations/user";

export function calcTabiScore({
  postCount,
  visitedCount,
  likesReceived,
  commentsReceived,
}: {
  postCount: number;
  visitedCount: number;
  likesReceived: number;
  commentsReceived: number;
}) {
  return postCount * 10 + visitedCount * 5 + likesReceived * 3 + commentsReceived * 2;
}

export function tabiRank(score: number) {
  if (score >= 100) return "プラチナトラベラー";
  if (score >= 60) return "ゴールドトラベラー";
  if (score >= 30) return "シルバートラベラー";
  return "ブロンズトラベラー";
}

export async function getUserProfileService(userId: string, viewerId?: string) {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("ユーザーが見つかりません");

  const [postCount, visitedCount, likesReceived, commentsReceived, followedByCurrentUser] =
    await Promise.all([
      countUserPosts(userId),
      countVisitedByUser(userId),
      countLikesReceived(userId),
      countCommentsReceived(userId),
      viewerId ? isFollowing(viewerId, userId) : Promise.resolve(false),
    ]);

  const tabiScore = calcTabiScore({ postCount, visitedCount, likesReceived, commentsReceived });

  return {
    id: user.id,
    nickname: user.nickname,
    image: user.image,
    bio: user.bio,
    postCount,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    followedByCurrentUser,
    tabiScore,
    tabiRank: tabiRank(tabiScore),
  };
}

export async function countUserPostsService(authorId: string, year?: number) {
  return countUserPosts(authorId, year);
}

export async function countVisitedByUserService(userId: string) {
  return countVisitedByUser(userId);
}

export async function getTabiScoresForUsers(userIds: string[]): Promise<Map<string, { score: number; rank: string }>> {
  const inputs = await computeTabiScoreInputsForUsers(userIds);
  const result = new Map<string, { score: number; rank: string }>();
  for (const [userId, values] of inputs) {
    const score = calcTabiScore(values);
    result.set(userId, { score, rank: tabiRank(score) });
  }
  return result;
}

export async function searchUsersService(options: {
  q: string;
  cursor?: string;
  limit: number;
  viewerId?: string;
}) {
  const { q, cursor, limit, viewerId } = options;
  const result = await searchUsersByNickname({ q, cursor, limit, excludeUserId: viewerId });
  const userIds = result.users.map((u) => u.id);
  const [followingIds, tabiScores] = await Promise.all([
    viewerId ? new Set(await findFollowingIdsAmong(viewerId, userIds)) : new Set<string>(),
    getTabiScoresForUsers(userIds),
  ]);

  const users = result.users
    .map((u) => ({
      ...u,
      followedByCurrentUser: followingIds.has(u.id),
      tabiScore: tabiScores.get(u.id)?.score ?? 0,
      tabiRank: tabiScores.get(u.id)?.rank ?? "ブロンズトラベラー",
    }))
    .sort((a, b) => b.tabiScore - a.tabiScore);

  return { ...result, users };
}

export async function updateUserService(targetUserId: string, actingUserId: string, data: UserUpdateInput) {
  if (targetUserId !== actingUserId) {
    throw new ForbiddenError("他のユーザーのプロフィールは編集できません");
  }
  return updateUserRepo(targetUserId, data);
}

export async function changePasswordService(
  targetUserId: string,
  actingUserId: string,
  currentPassword: string,
  newPassword: string
) {
  if (targetUserId !== actingUserId) {
    throw new ForbiddenError("他のユーザーのパスワードは変更できません");
  }

  const passwordHash = await findUserPasswordHash(targetUserId);
  if (!passwordHash) throw new NotFoundError();

  const isValid = await compare(currentPassword, passwordHash);
  if (!isValid) {
    throw new ValidationError("入力内容を確認してください", {
      currentPassword: ["現在のパスワードが正しくありません"],
    });
  }

  const hashedPassword = await hashPassword(newPassword);
  await updateUserPassword(targetUserId, hashedPassword);
}

export async function changeEmailService(
  targetUserId: string,
  actingUserId: string,
  newEmail: string,
  currentPassword: string
) {
  if (targetUserId !== actingUserId) {
    throw new ForbiddenError("他のユーザーのメールアドレスは変更できません");
  }

  const current = await findUserPasswordHashAndEmail(targetUserId);
  if (!current?.password) throw new NotFoundError();

  const isValid = await compare(currentPassword, current.password);
  if (!isValid) {
    throw new ValidationError("入力内容を確認してください", {
      currentPassword: ["現在のパスワードが正しくありません"],
    });
  }

  if (newEmail === current.email) {
    return;
  }

  const existing = await findUserByEmail(newEmail);
  if (existing) {
    throw new ConflictError("このメールアドレスはすでに使用されています");
  }

  await updateUserEmail(targetUserId, newEmail);
}
