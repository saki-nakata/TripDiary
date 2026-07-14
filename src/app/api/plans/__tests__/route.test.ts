import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/plan.service", () => ({
  findPlansByUserIdService: vi.fn(),
  createPlanService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findPlansByUserIdService, createPlanService } from "@/lib/services/plan.service";
import { GET, POST } from "@/app/api/plans/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

describe("GET /api/plans", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(findPlansByUserIdService).not.toHaveBeenCalled();
  });

  it("GET_認証済み_200かつプラン一覧を返す", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findPlansByUserIdService).mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
    expect(findPlansByUserIdService).toHaveBeenCalledWith(USER_ID);
  });
});

describe("POST /api/plans", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = { title: "京都・奈良 2泊3日" };

  it("POST_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      makeRequest("http://localhost/api/plans", { method: "POST", body: JSON.stringify(validBody) })
    );

    expect(res.status).toBe(401);
    expect(createPlanService).not.toHaveBeenCalled();
  });

  it("POST_タイトル未指定_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await POST(
      makeRequest("http://localhost/api/plans", { method: "POST", body: JSON.stringify({}) })
    );

    expect(res.status).toBe(400);
    expect(createPlanService).not.toHaveBeenCalled();
  });

  it("POST_タイトル61文字_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await POST(
      makeRequest("http://localhost/api/plans", {
        method: "POST",
        body: JSON.stringify({ title: "あ".repeat(61) }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("POST_正常なリクエスト_201", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(createPlanService).mockResolvedValue({ id: "plan-1" } as never);

    const res = await POST(
      makeRequest("http://localhost/api/plans", { method: "POST", body: JSON.stringify(validBody) })
    );

    expect(res.status).toBe(201);
    expect(createPlanService).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ title: validBody.title }));
  });
});
