import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function toggleLike(userId: string, postId: string) {
  const { count } = await prisma.like.deleteMany({ where: { userId, postId } });
  if (count > 0) return { liked: false };

  try {
    await prisma.like.create({ data: { userId, postId } });
    return { liked: true };
  } catch (e) {
    // 同時に別リクエストが先にcreateしていた場合（P2002: 一意制約違反）は、結果的に登録済みなので成功扱いにする
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { liked: true };
    }
    throw e;
  }
}
