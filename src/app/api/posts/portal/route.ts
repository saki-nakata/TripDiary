import { NextResponse } from "next/server";
import { getPortalDataService } from "@/lib/services/post.service";
import { handleApiError } from "@/lib/api-error";
import { withRequestLogging } from "@/lib/request-logging";

async function handleGET() {
  try {
    const data = await getPortalDataService();
    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}

export const GET = withRequestLogging(handleGET);
