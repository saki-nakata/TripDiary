import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError } from "@/lib/errors";

vi.mock("@/lib/s3", () => ({
  uploadObject: vi.fn((key: string) => Promise.resolve(`https://test-bucket.s3.ap-northeast-1.amazonaws.com/${key}`)),
}));

import { uploadObject } from "@/lib/s3";
import { saveUploadedFile } from "@/lib/services/upload.service";

const OWNER_ID = "user-1";

function makeFile(type: string, sizeBytes: number, name = "test.jpg"): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], name, { type });
}

describe("saveUploadedFile", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── post経路（既定・現状維持: 10MB / gif可） ───
  it("saveUploadedFile_引数なし_gifも許可される", async () => {
    const file = makeFile("image/gif", 1024, "test.gif");

    const result = await saveUploadedFile(file, OWNER_ID);

    expect(result.url).toMatch(/^https:\/\//);
  });

  it("saveUploadedFile_引数なし_10MB超は拒否される", async () => {
    const file = makeFile("image/jpeg", 10 * 1024 * 1024 + 1);

    await expect(saveUploadedFile(file, OWNER_ID)).rejects.toThrow(ValidationError);
  });

  it("saveUploadedFile_引数なし_10MB以内は許可される(境界値)", async () => {
    const file = makeFile("image/jpeg", 10 * 1024 * 1024);

    const result = await saveUploadedFile(file, OWNER_ID);

    expect(result.url).toMatch(/^https:\/\//);
  });

  // ─── avatar経路（オプション指定: 5MB / gif除外） ───
  const avatarOpts = { maxSize: 5 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp"] };

  it("saveUploadedFile_avatarオプション_gifは拒否される", async () => {
    const file = makeFile("image/gif", 1024, "test.gif");

    await expect(saveUploadedFile(file, OWNER_ID, avatarOpts)).rejects.toThrow(ValidationError);
  });

  it("saveUploadedFile_avatarオプション_5MB超は拒否される", async () => {
    const file = makeFile("image/jpeg", 5 * 1024 * 1024 + 1);

    await expect(saveUploadedFile(file, OWNER_ID, avatarOpts)).rejects.toThrow(ValidationError);
  });

  it("saveUploadedFile_avatarオプション_5MB以内のjpegは許可される(境界値)", async () => {
    const file = makeFile("image/jpeg", 5 * 1024 * 1024);

    const result = await saveUploadedFile(file, OWNER_ID, avatarOpts);

    expect(result.url).toMatch(/^https:\/\//);
  });

  it("saveUploadedFile_不正MIME_拒否される", async () => {
    const file = makeFile("application/pdf", 1024, "test.pdf");

    await expect(saveUploadedFile(file, OWNER_ID, avatarOpts)).rejects.toThrow(ValidationError);
  });

  // ─── オブジェクトキー ───
  it("saveUploadedFile_キーがuploads_ownerUserId_で始まる", async () => {
    const file = makeFile("image/jpeg", 1024);

    await saveUploadedFile(file, OWNER_ID);

    expect(uploadObject).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^uploads/${OWNER_ID}/[^/]+\\.jpg$`)),
      expect.any(Buffer),
      "image/jpeg"
    );
  });

  it("saveUploadedFile_拡張子はfile.nameではなくfile.type基準で決定される", async () => {
    const file = makeFile("image/png", 1024, "malicious/../name.exe");

    await saveUploadedFile(file, OWNER_ID);

    expect(uploadObject).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^uploads/${OWNER_ID}/[^/]+\\.png$`)),
      expect.any(Buffer),
      "image/png"
    );
  });
});
