import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { NotFoundError, ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/plan.service", () => ({
  findPlanByIdService: vi.fn(),
  updatePlanService: vi.fn(),
  deletePlanService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { findPlanByIdService, updatePlanService, deletePlanService } from "@/lib/services/plan.service";
import { GET, PUT, DELETE } from "@/app/api/plans/[id]/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const PLAN_ID = "plan-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

function makeParams() {
  return { params: Promise.resolve({ id: PLAN_ID }) };
}

describe("GET /api/plans/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET(makeRequest(`http://localhost/api/plans/${PLAN_ID}`), makeParams());

    expect(res.status).toBe(401);
  });

  it("GET_存在しないプラン_404", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findPlanByIdService).mockRejectedValue(new NotFoundError());

    const res = await GET(makeRequest(`http://localhost/api/plans/${PLAN_ID}`), makeParams());

    expect(res.status).toBe(404);
  });

  it("GET_他人のプラン_403", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findPlanByIdService).mockRejectedValue(new ForbiddenError());

    const res = await GET(makeRequest(`http://localhost/api/plans/${PLAN_ID}`), makeParams());

    expect(res.status).toBe(403);
  });

  it("GET_本人のプラン_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(findPlanByIdService).mockResolvedValue({ id: PLAN_ID } as never);

    const res = await GET(makeRequest(`http://localhost/api/plans/${PLAN_ID}`), makeParams());

    expect(res.status).toBe(200);
  });
});

describe("PUT /api/plans/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PUT_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PUT(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}`, { method: "PUT", body: JSON.stringify({ title: "更新" }) }),
      makeParams()
    );

    expect(res.status).toBe(401);
    expect(updatePlanService).not.toHaveBeenCalled();
  });

  it("PUT_タイトル未指定_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await PUT(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}`, { method: "PUT", body: JSON.stringify({}) }),
      makeParams()
    );

    expect(res.status).toBe(400);
  });

  it("PUT_他人のプラン_403", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(updatePlanService).mockRejectedValue(new ForbiddenError());

    const res = await PUT(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}`, { method: "PUT", body: JSON.stringify({ title: "更新" }) }),
      makeParams()
    );

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/plans/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DELETE_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await DELETE(makeRequest(`http://localhost/api/plans/${PLAN_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(401);
    expect(deletePlanService).not.toHaveBeenCalled();
  });

  it("DELETE_本人のプラン_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(deletePlanService).mockResolvedValue({} as never);

    const res = await DELETE(makeRequest(`http://localhost/api/plans/${PLAN_ID}`, { method: "DELETE" }), makeParams());

    expect(res.status).toBe(200);
  });
});
