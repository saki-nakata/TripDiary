import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleWishlistService } from "@/lib/services/wishlist.service";
import { handleApiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await toggleWishlistService(session.user.id, id);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
