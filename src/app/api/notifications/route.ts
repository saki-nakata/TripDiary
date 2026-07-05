import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/services/notification.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const notifications = await getUserNotifications(session.user.id);
    return NextResponse.json({ notifications });
  } catch (e) {
    return handleApiError(e);
  }
}
