import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/upload.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { withRequestLogging } from "@/lib/request-logging";

export const runtime = "nodejs";

const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function handlePOST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    checkRateLimit(`upload-avatar:${session.user.id}`, 10, 60 * 60 * 1000);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ValidationError("ファイルが見つかりません");
    }

    const result = await saveUploadedFile(file, {
      maxSize: AVATAR_MAX_SIZE,
      allowedTypes: AVATAR_ALLOWED_TYPES,
    });
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export const POST = withRequestLogging(handlePOST);
