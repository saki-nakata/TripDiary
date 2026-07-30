import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/services/notification.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

async function handleGET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const { searchParams } = req.nextUrl;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    const result = await getUserNotifications(session.user.id, { cursor, limit });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
