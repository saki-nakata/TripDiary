import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  try {
    await prisma.user.deleteMany({ where: { email } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    logger.error({ err: e }, "test cleanup failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
