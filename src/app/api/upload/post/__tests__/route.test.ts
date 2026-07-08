import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/services/upload.service", () => ({
  saveUploadedFile: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/services/upload.service";
import { POST } from "@/app/api/upload/post/route";

const authMock = auth as unknown as Mock;
const USER_ID = "user-1";

function makeFormDataRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new NextRequest(new Request("http://localhost/api/upload/post", { method: "POST", body: formData }));
}

describe("POST /api/upload/post", () => {
  beforeEach(() => vi.clearAllMocks());

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
  });

  it("POST_正常なファイル_オプションなしでsaveUploadedFileが呼ばれる(現状の10MB/gif可を維持)", async () => {
    authMock.mockResolvedValue({ user: { id: USER_ID } } as never);
    vi.mocked(saveUploadedFile).mockResolvedValue({ url: "/uploads/post.jpg" });

    const res = await POST(makeFormDataRequest(new File(["x"], "a.jpg", { type: "image/jpeg" })));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ url: "/uploads/post.jpg" });
    expect(saveUploadedFile).toHaveBeenCalledWith(expect.any(File));
  });
});
