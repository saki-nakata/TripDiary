import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getYearlyStatsService } from "@/lib/services/stats.service";
import { statsYearQuerySchema } from "@/lib/validations/stats";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { searchParams } = req.nextUrl;
    const parsed = statsYearQuerySchema.safeParse({ year: searchParams.get("year") });
    if (!parsed.success) {
      throw new ValidationError("Validation failed", parsed.error.flatten().fieldErrors);
    }

    const year = parsed.data.year === "all" ? null : parsed.data.year;
    const stats = await getYearlyStatsService(session.user.id, year);
    return NextResponse.json(stats);
  } catch (e) {
    return handleApiError(e);
  }
}
