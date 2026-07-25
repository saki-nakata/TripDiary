import { describe, it, expect } from "vitest";
import { readFileSync, globSync } from "node:fs";
import path from "node:path";
import { generateOpenApiDocument } from "@/lib/openapi/registry";

const HTTP_METHOD_EXPORT = /export const (GET|POST|PUT|DELETE|PATCH)\b/g;

// registerPath()への登録が不要な意図的な除外。
// - api/auth/[...nextauth]: NextAuthの標準ハンドラに委譲するだけで、アプリ定義のREST APIではない
// - api/openapi.json: 生成済みのOpenAPI定義自身を配信するエンドポイント（自己参照のため対象外）
// - api/test/cleanup: ENABLE_TEST_ENDPOINTS未設定時は本番で無効化されるテスト専用エンドポイント
const INTENTIONALLY_EXCLUDED_PATHS = new Set(["/api/auth/{...nextauth}", "/api/openapi.json", "/api/test/cleanup"]);

function collectRoutePathsAndMethods(): { path: string; method: string }[] {
  const appApiDir = path.join(process.cwd(), "src", "app", "api");
  const routeFiles = globSync("**/route.ts", { cwd: appApiDir });

  const result: { path: string; method: string }[] = [];
  for (const relativeFile of routeFiles) {
    const routeDir = path.dirname(relativeFile).replace(/\\/g, "/");
    const apiPath =
      "/api/" +
      routeDir
        .split("/")
        .filter((segment) => segment !== ".")
        .map((segment) => (segment.startsWith("[") && segment.endsWith("]") ? `{${segment.slice(1, -1)}}` : segment))
        .join("/");

    const source = readFileSync(path.join(appApiDir, relativeFile), "utf-8");
    const methods = [...source.matchAll(HTTP_METHOD_EXPORT)].map((m) => m[1].toLowerCase());
    for (const method of methods) {
      result.push({ path: apiPath, method });
    }
  }
  return result;
}

describe("generateOpenApiDocument", () => {
  it("実行時エラーなくOpenAPIドキュメントを生成できる", () => {
    expect(() => generateOpenApiDocument()).not.toThrow();
  });

  it("StatsResponseスキーマにyear/monthlyPostCount/yearlyPostCountが含まれる", () => {
    const doc = generateOpenApiDocument();
    const statsResponse = doc.components?.schemas?.StatsResponse as {
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(statsResponse).toBeDefined();
    expect(statsResponse.properties).toHaveProperty("year");
    expect(statsResponse.properties).toHaveProperty("monthlyPostCount");
    expect(statsResponse.properties).toHaveProperty("yearlyPostCount");
    expect(statsResponse.properties).not.toHaveProperty("monthlyCost");
  });

  it("登録済みの全パスがdoc.pathsに含まれる", () => {
    const doc = generateOpenApiDocument();

    expect(doc.paths["/api/plans"]).toBeDefined();
    expect(doc.paths["/api/stats"]).toBeDefined();
    expect(doc.paths["/api/stats/years"]).toBeDefined();
  });

  it("意図的除外を除く全route.ts×HTTPメソッドがregisterPath()で登録されている（docs/API仕様書.md廃止の根拠）", () => {
    const doc = generateOpenApiDocument();
    const routeEntries = collectRoutePathsAndMethods();

    const missing = routeEntries.filter(({ path: apiPath, method }) => {
      if (INTENTIONALLY_EXCLUDED_PATHS.has(apiPath)) return false;
      const pathItem = doc.paths[apiPath] as Record<string, unknown> | undefined;
      return !pathItem || !(method in pathItem);
    });

    expect(missing).toEqual([]);
  });
});
