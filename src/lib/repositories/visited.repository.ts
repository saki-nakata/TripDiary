import { prisma } from "@/lib/prisma";

export async function toggleVisited(userId: string, postId: string) {
  const existing = await prisma.visited.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.visited.delete({ where: { userId_postId: { userId, postId } } });
    return { visited: false };
  }

  await prisma.visited.create({ data: { userId, postId } });
  return { visited: true };
}
