import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "@/lib/openapi/registry";

// このルートは動的APIを使わないためNext.jsのビルド時静的プリレンダリング対象になるが、
// その静的解析フェーズではzod-to-openapiによるzodプロトタイプ拡張（zod-setup.ts）が
// 正しく反映されず `t.openapi is not a function` でビルドが失敗する。
// 常に動的ルートとして扱うことでこの静的解析をスキップする。
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(generateOpenApiDocument());
}
