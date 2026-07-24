import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/wishlist.repository", () => ({
  toggleWishlist: vi.fn(),
  countWishlistByUser: vi.fn(),
}));

import { toggleWishlist, countWishlistByUser } from "@/lib/repositories/wishlist.repository";
import { toggleWishlistService, countWishlistByUserService } from "@/lib/services/wishlist.service";

const USER_ID = "user-1";
const POST_ID = "post-1";

describe("toggleWishlistService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("toggleWishlist_repositoryの結果をそのまま返す", async () => {
    vi.mocked(toggleWishlist).mockResolvedValue({ wishlisted: true });

    const result = await toggleWishlistService(USER_ID, POST_ID);

    expect(result).toEqual({ wishlisted: true });
    expect(toggleWishlist).toHaveBeenCalledWith(USER_ID, POST_ID);
  });
});

describe("countWishlistByUserService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("countWishlistByUser_repositoryの結果をそのまま返す", async () => {
    vi.mocked(countWishlistByUser).mockResolvedValue(3);

    const result = await countWishlistByUserService(USER_ID);

    expect(result).toBe(3);
    expect(countWishlistByUser).toHaveBeenCalledWith(USER_ID);
  });
});
