import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableYearsService } from "@/lib/services/stats.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const years = await getAvailableYearsService(session.user.id);
    return NextResponse.json(years);
  } catch (e) {
    return handleApiError(e);
  }
}
