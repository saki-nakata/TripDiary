import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { ValidationError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/upload.service", () => ({
  saveUploadedFile: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/upload.service";
import { __resetRateLimitForTests } from "@/lib/rate-limit";
import { POST } from "@/app/api/upload/avatar/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeFormDataRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new NextRequest(new Request("http://localhost/api/upload/avatar", { method: "POST", body: formData }));
}

describe("POST /api/upload/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitForTests();
  });

  // ─── POST ───
  it("POST_未認証_401", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(makeFormDataRequest(new File(["x"], "a.jpg", { type: "image/jpeg" })));

    expect(res.status).toBe(401);
    expect(saveUploadedFile).not.toHaveBeenCalled();
  });

  it("POST_ファイル未指定_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);

    const res = await POST(makeFormDataRequest());

    expect(res.status).toBe(400);
    expect(saveUploadedFile).not.toHaveBeenCalled();
  });

  it("POST_不正ファイル(gif)_400", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(saveUploadedFile).mockRejectedValue(new ValidationError("アップロードできる形式: image/jpeg, image/png, image/webp"));

    const res = await POST(makeFormDataRequest(new File(["x"], "a.gif", { type: "image/gif" })));

    expect(res.status).toBe(400);
  });

  it("POST_正常なjpeg_5MB上限のオプション付きでsaveUploadedFileが呼ばれる", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(saveUploadedFile).mockResolvedValue({ url: "/uploads/avatar.jpg" });

    const res = await POST(makeFormDataRequest(new File(["x"], "a.jpg", { type: "image/jpeg" })));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: "/uploads/avatar.jpg" });
    expect(saveUploadedFile).toHaveBeenCalledWith(
      expect.any(File),
      { maxSize: 5 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp"] }
    );
  });

  it("POST_同一ユーザーから上限を超えて送信_429", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(saveUploadedFile).mockResolvedValue({ url: "/uploads/avatar.jpg" });

    for (let i = 0; i < 10; i++) {
      const res = await POST(makeFormDataRequest(new File(["x"], "a.jpg", { type: "image/jpeg" })));
      expect(res.status).toBe(200);
    }
    const res = await POST(makeFormDataRequest(new File(["x"], "a.jpg", { type: "image/jpeg" })));

    expect(res.status).toBe(429);
  });
});
