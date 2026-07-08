import { NextResponse } from "next/server";
import { getPortalDataService } from "@/lib/services/post.service";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const data = await getPortalDataService();
    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}
