import { prisma } from "@/lib/prisma";

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
  const [comment] = await prisma.$transaction([
    prisma.comment.create({
      data: { postId, authorId, body },
      select: { ...COMMENT_SELECT, postId: true, authorId: true },
    }),
    prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
  ]);
  return comment;
}

export async function findCommentById(id: string) {
  return prisma.comment.findUnique({
    where: { id },
    select: { id: true, authorId: true, postId: true, post: { select: { authorId: true } } },
  });
}

export async function deleteComment(id: string, postId: string) {
  const [comment] = await prisma.$transaction([
    prisma.comment.delete({ where: { id } }),
    prisma.post.update({ where: { id: postId }, data: { commentCount: { decrement: 1 } } }),
  ]);
  return comment;
}
