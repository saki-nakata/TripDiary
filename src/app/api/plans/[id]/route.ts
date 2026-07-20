import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { findPlanByIdService, updatePlanService, deletePlanService } from "@/lib/services/plan.service";
import { planSchema } from "@/lib/validations/plan";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

async function handleGET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const plan = await findPlanByIdService(session.user.id, id);
    return NextResponse.json(plan);
  } catch (e) {
    return handleApiError(e);
  }
}

async function handlePUT(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const updated = await updatePlanService(session.user.id, id, parsed.data);
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

async function handleDELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    await deletePlanService(session.user.id, id);
    return NextResponse.json({ message: "Deleted" });
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
export const PUT = withRequestLogging(handlePUT);
export const DELETE = withRequestLogging(handleDELETE);
