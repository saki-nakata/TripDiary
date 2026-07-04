import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/upload.service";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 400 });
    }

    const result = await saveUploadedFile(file);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
