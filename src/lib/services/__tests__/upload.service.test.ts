import { describe, it, expect, vi, beforeEach } from "vitest";
import { ValidationError } from "@/lib/errors";

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { saveUploadedFile } from "@/lib/services/upload.service";

function makeFile(type: string, sizeBytes: number, name = "test.jpg"): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], name, { type });
}

describe("saveUploadedFile", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── post経路（既定・現状維持: 10MB / gif可） ───
  it("saveUploadedFile_引数なし_gifも許可される", async () => {
    const file = makeFile("image/gif", 1024, "test.gif");

    const result = await saveUploadedFile(file);

    expect(result.url).toMatch(/^\/uploads\//);
  });

  it("saveUploadedFile_引数なし_10MB超は拒否される", async () => {
    const file = makeFile("image/jpeg", 10 * 1024 * 1024 + 1);

    await expect(saveUploadedFile(file)).rejects.toThrow(ValidationError);
  });

  it("saveUploadedFile_引数なし_10MB以内は許可される(境界値)", async () => {
    const file = makeFile("image/jpeg", 10 * 1024 * 1024);

    const result = await saveUploadedFile(file);

    expect(result.url).toMatch(/^\/uploads\//);
  });

  // ─── avatar経路（オプション指定: 5MB / gif除外） ───
  const avatarOpts = { maxSize: 5 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp"] };

  it("saveUploadedFile_avatarオプション_gifは拒否される", async () => {
    const file = makeFile("image/gif", 1024, "test.gif");

    await expect(saveUploadedFile(file, avatarOpts)).rejects.toThrow(ValidationError);
  });

  it("saveUploadedFile_avatarオプション_5MB超は拒否される", async () => {
    const file = makeFile("image/jpeg", 5 * 1024 * 1024 + 1);

    await expect(saveUploadedFile(file, avatarOpts)).rejects.toThrow(ValidationError);
  });

  it("saveUploadedFile_avatarオプション_5MB以内のjpegは許可される(境界値)", async () => {
    const file = makeFile("image/jpeg", 5 * 1024 * 1024);

    const result = await saveUploadedFile(file, avatarOpts);

    expect(result.url).toMatch(/^\/uploads\//);
  });

  it("saveUploadedFile_不正MIME_拒否される", async () => {
    const file = makeFile("application/pdf", 1024, "test.pdf");

    await expect(saveUploadedFile(file, avatarOpts)).rejects.toThrow(ValidationError);
  });
});
