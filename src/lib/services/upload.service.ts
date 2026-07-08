import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { ValidationError } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function saveUploadedFile(
  file: File,
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

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const uploadsDir = join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadsDir, filename), buffer);

  return { url: `/uploads/${filename}` };
}
