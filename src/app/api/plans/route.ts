import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPlanService, findPlansByUserIdService } from "@/lib/services/plan.service";
import { planSchema } from "@/lib/validations/plan";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const plans = await findPlansByUserIdService(session.user.id);
    return NextResponse.json(plans);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const body = await req.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const plan = await createPlanService(session.user.id, parsed.data);
    return NextResponse.json(plan, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
