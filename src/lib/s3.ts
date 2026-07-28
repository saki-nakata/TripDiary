import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";
import { getBucketHostname } from "@/lib/s3-url";
import { getRequestContext } from "@/lib/request-context";

const globalForS3 = globalThis as unknown as { s3Client?: S3Client };

function getS3Client(): S3Client {
  if (!globalForS3.s3Client) {
    globalForS3.s3Client = new S3Client({ region: process.env.AWS_REGION });
  }
  return globalForS3.s3Client;
}

function assertS3Configured(): void {
  if (!process.env.AWS_REGION || !process.env.AWS_S3_BUCKET_NAME) {
    throw new Error("S3設定(AWS_REGION/AWS_S3_BUCKET_NAME)が未設定です");
  }
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  assertS3Configured();

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return `https://${getBucketHostname()}/${key}`;
}

export function extractKeyFromUrl(url: string): string | null {
  const hostname = getBucketHostname();
  if (!hostname) {
    logger.warn({ ...getRequestContext(), url }, "S3キー抽出をスキップ: バケット設定が未確定");
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    logger.warn({ ...getRequestContext(), url }, "S3キー抽出をスキップ: URLとして解析できない");
    return null;
  }

  if (parsed.hostname !== hostname) {
    logger.warn({ ...getRequestContext(), url }, "S3キー抽出をスキップ: 想定外のホスト名");
    return null;
  }

  let key: string;
  try {
    key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  } catch {
    logger.warn({ ...getRequestContext(), url }, "S3キー抽出をスキップ: percent-encodingの解析に失敗");
    return null;
  }

  if (!key.startsWith("uploads/")) {
    logger.warn({ ...getRequestContext(), url }, "S3キー抽出をスキップ: 想定外のパス");
    return null;
  }

  return key;
}

export function isOwnedS3Url(url: string, ownerUserId: string): boolean {
  const key = extractKeyFromUrl(url);
  return key !== null && key.startsWith(`uploads/${ownerUserId}/`);
}

export async function deleteOwnedObjectsByUrl(urls: string[], ownerUserId: string): Promise<void> {
  const keys = urls
    .map((url) => {
      const key = extractKeyFromUrl(url);
      if (key === null || !key.startsWith(`uploads/${ownerUserId}/`)) {
        logger.warn({ ...getRequestContext(), url, ownerUserId }, "S3削除をスキップ: 所有者以外または解析不能なURL");
        return null;
      }
      return key;
    })
    .filter((k): k is string => k !== null);

  if (keys.length === 0) return;

  try {
    const result = await getS3Client().send(
      new DeleteObjectsCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      })
    );

    for (const err of result.Errors ?? []) {
      logger.error(
        { ...getRequestContext(), ownerUserId, key: err.Key, code: err.Code, message: err.Message },
        "S3オブジェクト削除に一部失敗"
      );
    }
  } catch (e) {
    logger.error({ ...getRequestContext(), err: e, ownerUserId, keys }, "S3オブジェクト削除に失敗");
  }
}
