import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function toggleWishlist(userId: string, postId: string) {
  const { count } = await prisma.wishlist.deleteMany({ where: { userId, postId } });
  if (count > 0) return { wishlisted: false };

  try {
    await prisma.wishlist.create({ data: { userId, postId } });
    return { wishlisted: true };
  } catch (e) {
    // 同時に別リクエストが先にcreateしていた場合（P2002: 一意制約違反）は、結果的に登録済みなので成功扱いにする
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { wishlisted: true };
    }
    throw e;
  }
}

export async function countWishlistByUser(userId: string) {
  return prisma.wishlist.count({ where: { userId } });
}
