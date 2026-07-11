import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function toggleVisited(userId: string, postId: string) {
  const { count } = await prisma.visited.deleteMany({ where: { userId, postId } });
  if (count > 0) return { visited: false };

  try {
    await prisma.visited.create({ data: { userId, postId } });
    return { visited: true };
  } catch (e) {
    // 同時に別リクエストが先にcreateしていた場合（P2002: 一意制約違反）は、結果的に登録済みなので成功扱いにする
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { visited: true };
    }
    throw e;
  }
}
