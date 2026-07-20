import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUnreadCountService } from "@/lib/services/notification.service";
import { handleApiError } from "@/lib/api-error";
import { withRequestLogging } from "@/lib/request-logging";

async function handleGET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ count: 0 });

    const count = await getUnreadCountService(session.user.id);
    return NextResponse.json({ count });
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
