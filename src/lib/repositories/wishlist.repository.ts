import { prisma } from "@/lib/prisma";

export async function toggleWishlist(userId: string, postId: string) {
  const existing = await prisma.wishlist.findUnique({
    where: { userId_postId: { userId, postId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { userId_postId: { userId, postId } } });
    return { wishlisted: false };
  }

  await prisma.wishlist.create({ data: { userId, postId } });
  return { wishlisted: true };
}

export async function countWishlistByUser(userId: string) {
  return prisma.wishlist.count({ where: { userId } });
}
