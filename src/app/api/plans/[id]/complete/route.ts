import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setPlanCompletedService } from "@/lib/services/plan.service";
import { planCompleteSchema } from "@/lib/validations/plan";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

async function handlePATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = planCompleteSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const updated = await setPlanCompletedService(session.user.id, id, parsed.data.completed, parsed.data.version);
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export const PATCH = withRequestLogging(handlePATCH);
