import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/plan.service", () => ({
  togglePlanCompletedService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { togglePlanCompletedService } from "@/lib/services/plan.service";
import { PATCH } from "@/app/api/plans/[id]/complete/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";
const PLAN_ID = "plan-1";

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

function makeParams() {
  return { params: Promise.resolve({ id: PLAN_ID }) };
}

describe("PATCH /api/plans/[id]/complete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH" }), makeParams());

    expect(res.status).toBe(401);
    expect(togglePlanCompletedService).not.toHaveBeenCalled();
  });

  it("PATCH_他人のプラン_403", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(togglePlanCompletedService).mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH" }), makeParams());

    expect(res.status).toBe(403);
  });

  it("PATCH_本人のプラン_200かつ更新されたプランを返す", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(togglePlanCompletedService).mockResolvedValue({ id: PLAN_ID, completed: true } as never);

    const res = await PATCH(makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH" }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.completed).toBe(true);
  });
});
