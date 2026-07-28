import { randomUUID } from "crypto";
import { ValidationError } from "@/lib/errors";
import { uploadObject } from "@/lib/s3";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function saveUploadedFile(
  file: File,
  ownerUserId: string,
  opts?: { maxSize?: number; allowedTypes?: string[] }
): Promise<{ url: string }> {
  const allowedTypes = opts?.allowedTypes ?? ALLOWED_TYPES;
  const maxSize = opts?.maxSize ?? MAX_SIZE;

  if (!allowedTypes.includes(file.type)) {
    throw new ValidationError(`アップロードできる形式: ${allowedTypes.join(", ")}`);
  }
  if (file.size > maxSize) {
    throw new ValidationError(`ファイルサイズは${Math.floor(maxSize / (1024 * 1024))}MB以内にしてください`);
  }

  const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
  const key = `uploads/${ownerUserId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadObject(key, buffer, file.type);

  return { url };
}
