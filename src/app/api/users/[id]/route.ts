import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserProfileService, updateUserService } from "@/lib/services/user.service";
import { userUpdateSchema } from "@/lib/validations/user";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { withRequestLogging } from "@/lib/request-logging";

type Params = { params: Promise<{ id: string }> };

async function handleGET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    const profile = await getUserProfileService(id, session?.user?.id);
    return NextResponse.json(profile);
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
    const json = await req.json();
    const parsed = userUpdateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError("入力内容を確認してください", parsed.error.flatten().fieldErrors);
    }

    const user = await updateUserService(id, session.user.id, parsed.data);
    return NextResponse.json(user);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
export const PUT = withRequestLogging(handlePUT);
