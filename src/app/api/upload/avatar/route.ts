import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/upload.service";
import { handleApiError } from "@/lib/api-error";
import { UnauthorizedError, ValidationError } from "@/lib/errors";

const AVATAR_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();

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
