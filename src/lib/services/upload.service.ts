import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { ValidationError } from "@/lib/errors";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function saveUploadedFile(file: File): Promise<{ url: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError("JPEG・PNG・WebP・GIF のみアップロードできます");
  }
  if (file.size > MAX_SIZE) {
    throw new ValidationError("ファイルサイズは10MB以内にしてください");
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const uploadsDir = join(process.cwd(), "public", "uploads");

  await mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadsDir, filename), buffer);

  return { url: `/uploads/${filename}` };
}
