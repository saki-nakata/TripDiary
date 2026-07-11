import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { togglePlanCompletedService } from "@/lib/services/plan.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const updated = await togglePlanCompletedService(session.user.id, id);
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}
