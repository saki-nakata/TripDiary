import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markAsReadService } from "@/lib/services/notification.service";
import { handleApiError } from "@/lib/api-error";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await markAsReadService(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
