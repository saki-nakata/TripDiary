import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/openapi/registry";

export async function GET() {
  return NextResponse.json(generateOpenApiDocument());
}
