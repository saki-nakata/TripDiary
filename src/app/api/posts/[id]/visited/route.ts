import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toggleVisitedService } from "@/lib/services/visited.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

async function handlePOST(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const result = await toggleVisitedService(session.user.id, id);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const POST = withRequestLogging(handlePOST);
