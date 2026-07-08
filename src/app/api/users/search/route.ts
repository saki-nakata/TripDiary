import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchUsersService } from "@/lib/services/user.service";
import { handleApiError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";

    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const session = await auth();
    const viewerId = session?.user?.id;

    const result = await searchUsersService({ q, cursor, limit, viewerId });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
