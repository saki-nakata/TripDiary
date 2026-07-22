import { prisma } from "@/lib/prisma";
import { withDeadlockRetry } from "@/lib/prisma-retry";

const COMMENT_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  author: {
    select: { id: true, nickname: true, image: true },
  },
} as const;

export async function findCommentsByPostId({
  postId,
  cursor,
  limit = 20,
}: {
  postId: string;
  cursor?: string;
  limit?: number;
}) {
  const comments = await prisma.comment.findMany({
    where: { postId },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: "asc" },
    select: COMMENT_SELECT,
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, limit) : comments;
  return {
    comments: items.map((c) => ({
      ...c,
      createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    hasMore,
  };
}

export async function createComment({
  postId,
  authorId,
  body,
}: {
  postId: string;
  authorId: string;
  body: string;
}) {
  // Post行を先に更新して排他ロックを取得してからCommentをINSERTする。逆順だと、同じ投稿へ
  // 同時にコメントするトランザクションが外部キー由来の共有ロックを持ったままPost行の排他
  // ロックを待つため、ロック待ちタイムアウトが連鎖し得る。
  const [, comment] = await withDeadlockRetry(() =>
    prisma.$transaction([
      prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
      prisma.comment.create({
        data: { postId, authorId, body },
        select: { ...COMMENT_SELECT, postId: true, authorId: true },
      }),
    ])
  );
  return comment;
}

export async function findCommentById(id: string) {
  return prisma.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, postId: true, post: { select: { authorId: true } } },
  });
}

export async function deleteComment(id: string, postId: string) {
  // createCommentと同じロック順序を保つ。どちらの操作もPost行から取得することで、同一投稿へ
  // の作成・削除が混在してもロック取得順が逆転しない。
  const [, comment] = await withDeadlockRetry(() =>
    prisma.$transaction([
      prisma.post.update({ where: { id: postId }, data: { commentCount: { decrement: 1 } } }),
      prisma.comment.delete({ where: { id } }),
    ])
  );
  return comment;
}
