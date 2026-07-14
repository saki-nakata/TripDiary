import { toggleWishlist, countWishlistByUser } from "@/lib/repositories/wishlist.repository";

export async function toggleWishlistService(userId: string, postId: string) {
  return toggleWishlist(userId, postId);
}

export async function countWishlistByUserService(userId: string) {
  return countWishlistByUser(userId);
}
