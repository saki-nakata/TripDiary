import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserNotifications } from "@/lib/services/notification.service";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifications = await getUserNotifications(session.user.id);
    return NextResponse.json({ notifications });
  } catch (e) {
    return handleApiError(e);
  }
}
