import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/upload.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { withRequestLogging } from "@/lib/request-logging";

export const runtime = "nodejs";

async function handlePOST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    checkRateLimit(`upload-post:${session.user.id}`, 30, 60 * 60 * 1000);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("ファイルが見つかりません");
    }

    const result = await saveUploadedFile(file);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const POST = withRequestLogging(handlePOST);
