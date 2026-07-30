import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { ForbiddenError, ConflictError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/plan.service", () => ({
  setPlanCompletedService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { setPlanCompletedService } from "@/lib/services/plan.service";
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

const VALID_BODY = { completed: true, version: 0 };

describe("PATCH /api/plans/[id]/complete（目標状態を受け取る冪等なset、GATE-21/DR-01）", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );

    expect(res.status).toBe(401);
    expect(setPlanCompletedService).not.toHaveBeenCalled();
  });

  it("PATCH_version未指定_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await PATCH(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH", body: JSON.stringify({ completed: true }) }),
      makeParams()
    );

    expect(res.status).toBe(400);
    expect(setPlanCompletedService).not.toHaveBeenCalled();
  });

  it("PATCH_他人のプラン_403", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(setPlanCompletedService).mockRejectedValue(new ForbiddenError());

    const res = await PATCH(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );

    expect(res.status).toBe(403);
  });

  it("PATCH_他リクエストとの更新競合(version不一致)_409", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(setPlanCompletedService).mockRejectedValue(new ConflictError("他の画面で更新されています。再読み込みしてください。"));

    const res = await PATCH(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );

    expect(res.status).toBe(409);
  });

  it("PATCH_本人のプラン_200かつ更新されたプランを返し完了状態・versionが渡される", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(setPlanCompletedService).mockResolvedValue({ id: PLAN_ID, completed: true } as never);

    const res = await PATCH(
      makeRequest(`http://localhost/api/plans/${PLAN_ID}/complete`, { method: "PATCH", body: JSON.stringify(VALID_BODY) }),
      makeParams()
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.completed).toBe(true);
    expect(setPlanCompletedService).toHaveBeenCalledWith(USER_ID, PLAN_ID, true, 0);
  });
});
