import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { ForbiddenError, ConflictError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/user.service", () => ({
  changeEmailService: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { changeEmailService } from "@/lib/services/user.service";
import { PATCH } from "@/app/api/users/[id]/email/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeRequest(body: unknown) {
  return new NextRequest(
    new Request(`http://localhost/api/users/${USER_ID}/email`, { method: "PATCH", body: JSON.stringify(body) })
  );
}

function makeParams() {
  return { params: Promise.resolve({ id: USER_ID }) };
}

describe("PATCH /api/users/[id]/email", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = { email: "new@example.com", currentPassword: "current-pw" };

  it("PATCH_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(401);
    expect(changeEmailService).not.toHaveBeenCalled();
  });

  it("PATCH_不正なメール形式_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await PATCH(makeRequest({ email: "not-an-email", currentPassword: "current-pw" }), makeParams());

    expect(res.status).toBe(400);
    expect(changeEmailService).not.toHaveBeenCalled();
  });

  it("PATCH_他人のID_403", async () => {
    authMock.mockResolvedValue({ user: { id: "other-user" } } as never);
    vi.mocked(changeEmailService).mockRejectedValue(new ForbiddenError());

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(403);
  });

  it("PATCH_メールアドレス重複_409", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(changeEmailService).mockRejectedValue(new ConflictError("このメールアドレスはすでに使用されています"));

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(409);
  });

  it("PATCH_正常なリクエスト_200", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(changeEmailService).mockResolvedValue(undefined);

    const res = await PATCH(makeRequest(validBody), makeParams());

    expect(res.status).toBe(200);
    expect(changeEmailService).toHaveBeenCalledWith(USER_ID, USER_ID, "new@example.com", "current-pw");
  });
});
