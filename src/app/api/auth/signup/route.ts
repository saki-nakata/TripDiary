import { NextRequest, NextResponse } from "next/server";
import { signupService } from "@/lib/services/auth.service";
import { signupApiSchema } from "@/lib/validations/auth";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = signupApiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "入力内容に誤りがあります", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await signupService(parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
