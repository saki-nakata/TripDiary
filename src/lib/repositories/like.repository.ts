import { prisma } from "@/lib/prisma";

export async function toggleLike(userId: string, postId: string) {
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
    return { liked: false };
  }

  await prisma.like.create({ data: { userId, postId } });
  return { liked: true };
}
