import { toggleWishlist } from "@/lib/repositories/wishlist.repository";

export async function toggleWishlistService(userId: string, postId: string) {
  return toggleWishlist(userId, postId);
}
