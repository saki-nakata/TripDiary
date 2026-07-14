import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { changeEmailService } from "@/lib/services/user.service";
import { emailChangeSchema } from "@/lib/validations/user";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const { id } = await params;
    const json = await req.json();
    const parsed = emailChangeSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError("入力内容を確認してください", parsed.error.flatten().fieldErrors);
    }

    await changeEmailService(id, session.user.id, parsed.data.email, parsed.data.currentPassword);
    return NextResponse.json({ message: "メールアドレスを変更しました" });
  } catch (e) {
    return handleApiError(e);
  }
}
