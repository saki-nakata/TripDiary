import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markAsReadService } from "@/lib/services/notification.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

async function handlePATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

    const { id } = await params;
    await markAsReadService(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}

export const PATCH = withRequestLogging(handlePATCH);
