import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { ForbiddenError, ValidationError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  changePasswordService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { changePasswordService } from "@/lib/services/user.service";
import { PATCH } from "@/app/api/users/[id]/password/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(body: unknown) {
  return new NextRequest(
    new Request(`http://localhost/api/users/${USER_ID}/password`, { method: "PATCH", body: JSON.stringify(body) })
  );
}

function makeParams() {
  return { params: Promise.resolve({ id: USER_ID }) };
}

describe("PATCH /api/users/[id]/password", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = { currentPassword: "current-pw", newPassword: "new-password" };

  it("PATCH_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(401);
    expect(changePasswordService).not.toHaveBeenCalled();
  });

  it("PATCH_newPasswordが7文字_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await PATCH(makeRequest({ currentPassword: "current-pw", newPassword: "a".repeat(7) }), makeParams());

    expect(res.status).toBe(400);
    expect(changePasswordService).not.toHaveBeenCalled();
  });

  it("PATCH_他人のID_403", async () => {
    authMock.mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(changePasswordService).mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(403);
  });

  it("PATCH_現在のパスワードが誤り_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(changePasswordService).mockRejectedValue(
      new ValidationError("入力内容を確認してください", { currentPassword: ["現在のパスワードが正しくありません"] })
    );

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(400);
  });

  it("PATCH_正常なリクエスト_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(changePasswordService).mockResolvedValue(undefined);

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(200);
    expect(changePasswordService).toHaveBeenCalledWith(USER_ID, USER_ID, "current-pw", "new-password");
  });
});
