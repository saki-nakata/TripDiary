import { describe, it, expect } from "vitest";
import { generateOpenApiDocument } from "@/lib/openapi/registry";

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
});
