import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { changePasswordService } from "@/lib/services/user.service";
import { passwordChangeApiSchema } from "@/lib/validations/user";
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
    const json = await req.json();
    const parsed = passwordChangeApiSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError("入力内容を確認してください", parsed.error.flatten().fieldErrors);
    }

    await changePasswordService(id, session.user.id, parsed.data.currentPassword, parsed.data.newPassword);
    return NextResponse.json({ message: "パスワードを変更しました" });
  } catch (e) {
    return handleApiError(e);
  }
}

export const PATCH = withRequestLogging(handlePATCH);
