import { NextRequest, NextResponse } from "next/server";
import { signupService } from "@/lib/services/auth.service";
import { signupApiSchema } from "@/lib/validations/auth";
import { handleApiError } from "@/lib/api-error";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { withRequestLogging } from "@/lib/request-logging";

export const runtime = "nodejs";

async function handlePOST(req: NextRequest) {
  try {
    checkRateLimit(`signup:${getClientIp(req)}`, 10, 60 * 60 * 1000);

    const body = await req.json();

    const parsed = signupApiSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const user = await signupService(parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

export const POST = withRequestLogging(handlePOST);
