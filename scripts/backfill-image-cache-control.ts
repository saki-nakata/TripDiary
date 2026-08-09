import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  type HeadObjectCommandOutput,
  type ServerSideEncryption,
  type StorageClass,
} from "@aws-sdk/client-s3";

// 本番S3の既存オブジェクトへCache-Control（B-3、実装計画書/phase8.md）を遡及付与するバックフィル。
// 対応する今後アップロード分のヘッダ付与はsrc/lib/s3.tsのuploadObject()側で対応済み（別コミット）。
//
// 実行方法:
//   スキャン＋manifest保存のみ（安全・書き込みなし）:
//     pnpm exec dotenv -e .env.local -- pnpm backfill:image-cache-control
//   実際に書き換える（--applyのみ有効。ゲート3の安全チェックリストが揃うまで実行しないこと。
//   実装計画書/phase8.md「⚠️ --apply実行の安全ゲート」参照）:
//     CONFIRM_PRODUCTION_S3_BACKFILL=true pnpm exec dotenv -e .env.local -- \
//       pnpm backfill:image-cache-control --apply
//   バックフィル前の状態へ復元する（--restore-manifestは常にdry-run既定、--applyで実行）:
//     pnpm backfill:image-cache-control --restore-manifest ./s3-manifests/<file>.json
//     CONFIRM_PRODUCTION_S3_BACKFILL=true pnpm backfill:image-cache-control \
//       --restore-manifest ./s3-manifests/<file>.json --apply
//
// 認証情報: `terraform apply`用の管理者クレデンシャルは使わない。対象バケットのListBucket・
// uploads/*のGetObject・uploads/*のPutObjectのみを持つ専用ポリシー／一時セッションで実行する
// （EC2ロールはListBucketを持たないためEC2上でも実行しない）。
//
// aws s3 cp --recursive --metadata-directive REPLACEは使わない。--content-typeを一律指定すると
// png/webpが壊れ、指定しないとContentTypeが失われるため、AWS SDKで1オブジェクトずつ扱う。

const TARGET_CACHE_CONTROL = "public, max-age=31536000, immutable";
const UPLOADS_PREFIX = "uploads/";
const BUCKET = process.env.AWS_S3_BUCKET_NAME;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const restoreManifestIdx = args.indexOf("--restore-manifest");
const RESTORE_MANIFEST_PATH = restoreManifestIdx >= 0 ? args[restoreManifestIdx + 1] : null;

if (restoreManifestIdx >= 0 && !RESTORE_MANIFEST_PATH) {
  throw new Error("[backfill] --restore-manifest にはファイルパスを指定してください");
}

function getS3Client(): S3Client {
  if (!process.env.AWS_REGION || !BUCKET) {
    throw new Error("[backfill] S3設定(AWS_REGION/AWS_S3_BUCKET_NAME)が未設定です");
  }
  return new S3Client({ region: process.env.AWS_REGION });
}

type ObjectMetadata = {
  key: string;
  eTag: string | undefined;
  cacheControl: string | undefined;
  contentType: string | undefined;
  contentDisposition: string | undefined;
  contentEncoding: string | undefined;
  contentLanguage: string | undefined;
  expires: string | undefined;
  metadata: Record<string, string> | undefined;
  storageClass: StorageClass | undefined;
  serverSideEncryption: ServerSideEncryption | undefined;
};

function toObjectMetadata(key: string, head: HeadObjectCommandOutput): ObjectMetadata {
  return {
    key,
    eTag: head.ETag,
    cacheControl: head.CacheControl,
    contentType: head.ContentType,
    contentDisposition: head.ContentDisposition,
    contentEncoding: head.ContentEncoding,
    contentLanguage: head.ContentLanguage,
    expires: head.Expires ? head.Expires.toISOString() : undefined,
    metadata: head.Metadata,
    storageClass: head.StorageClass,
    serverSideEncryption: head.ServerSideEncryption,
  };
}

async function listAllUploadKeys(client: S3Client): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: UPLOADS_PREFIX,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function headObject(client: S3Client, key: string): Promise<ObjectMetadata> {
  const head = await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return toObjectMetadata(key, head);
}

function saveManifest(entries: ObjectMetadata[], suffix: string): string {
  const dir = path.join(process.cwd(), "s3-manifests");
  mkdirSync(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(dir, `${timestamp}-${suffix}.json`);
  writeFileSync(filePath, JSON.stringify({ bucket: BUCKET, createdAt: new Date().toISOString(), entries }, null, 2));
  return filePath;
}

// S3のキー区切り「/」はCopySource中で構造上の意味を持つリテラル文字であり、URLエンコードしては
// いけない（key全体にencodeURIComponentをかけると"/"が%2Fになり、実在しないキーを指してしまい
// CopyObjectがNoSuchKeyで失敗する）。パスセグメントごとにエンコードして"/"だけ残す。
function encodeS3KeyForCopySource(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

// CopyObjectでMetadataDirective:"REPLACE"を使う場合、保持したい既存メタデータを
// 全て明示的に指定し直す必要がある（指定しなかった項目は落ちる）。
function buildCopyParams(current: ObjectMetadata, cacheControl: string | undefined) {
  return {
    Bucket: BUCKET,
    Key: current.key,
    CopySource: `${BUCKET}/${encodeS3KeyForCopySource(current.key)}`,
    CopySourceIfMatch: current.eTag,
    MetadataDirective: "REPLACE" as const,
    CacheControl: cacheControl,
    ContentType: current.contentType,
    ContentDisposition: current.contentDisposition,
    ContentEncoding: current.contentEncoding,
    ContentLanguage: current.contentLanguage,
    Expires: current.expires ? new Date(current.expires) : undefined,
    Metadata: current.metadata,
    StorageClass: current.storageClass,
    ServerSideEncryption: current.serverSideEncryption,
  };
}

async function runBackfill(client: S3Client): Promise<void> {
  console.log(`[backfill] バケット: ${BUCKET} / リージョン: ${process.env.AWS_REGION}`);
  console.log(`[backfill] 対象プレフィックス: ${UPLOADS_PREFIX}`);

  const keys = await listAllUploadKeys(client);
  console.log(`[backfill] 対象オブジェクト: ${keys.length}件`);

  const heads: ObjectMetadata[] = [];
  for (const key of keys) {
    heads.push(await headObject(client, key));
  }

  const alreadyOk = heads.filter((h) => h.cacheControl === TARGET_CACHE_CONTROL);
  const toUpdate = heads.filter((h) => h.cacheControl !== TARGET_CACHE_CONTROL);

  const manifestPath = saveManifest(heads, "pre-backfill");
  console.log(`[backfill] 変更前メタデータmanifestを保存: ${manifestPath}`);
  console.log(`[backfill] 既にCache-Control設定済み（スキップ対象）: ${alreadyOk.length}件`);
  console.log(`[backfill] 更新対象: ${toUpdate.length}件`);

  if (!APPLY) {
    console.log(`[backfill] dry-runのため書き込みは行っていません。実行するには --apply を指定してください。`);
    return;
  }

  if (process.env.CONFIRM_PRODUCTION_S3_BACKFILL !== "true") {
    throw new Error(
      "[backfill] CONFIRM_PRODUCTION_S3_BACKFILL=trueが設定されていません。本番S3への書き込みを伴うため、意図した実行であることを明示的に確認してください。"
    );
  }

  const failed: string[] = [];
  for (const current of toUpdate) {
    try {
      await client.send(new CopyObjectCommand(buildCopyParams(current, TARGET_CACHE_CONTROL)));
      console.log(`[backfill] 更新: ${current.key}`);
    } catch (e) {
      console.error(`[backfill] 更新失敗: ${current.key}`, e);
      failed.push(current.key);
    }
  }

  if (failed.length > 0) {
    console.error(`[backfill] ${failed.length}件失敗しました。再実行で続きから処理されます（冪等）。`);
    process.exitCode = 1;
  } else {
    console.log(`[backfill] 完了。更新: ${toUpdate.length}件、スキップ: ${alreadyOk.length}件`);
  }
}

async function runRestore(client: S3Client, manifestPath: string): Promise<void> {
  const raw = readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw) as { bucket: string; entries: ObjectMetadata[] };

  if (manifest.bucket !== BUCKET) {
    throw new Error(
      `[backfill] manifestのバケット（${manifest.bucket}）と現在の接続先（${BUCKET}）が一致しません。中断します。`
    );
  }

  console.log(`[backfill] 復元対象manifest: ${manifestPath}（${manifest.entries.length}件）`);

  // 復元時は現在のETagを取り直してCopySourceIfMatchに使う。manifest保存後にバックフィルの
  // CopyObjectでETagが変わっているため、manifest内の古いETagとの比較は常に失敗し得る。
  const currentHeads: ObjectMetadata[] = [];
  for (const entry of manifest.entries) {
    currentHeads.push(await headObject(client, entry.key));
  }

  const diffTargets = manifest.entries.filter((entry, i) => currentHeads[i].cacheControl !== entry.cacheControl);
  console.log(`[backfill] 復元が必要な件数（Cache-Controlが manifest と異なる）: ${diffTargets.length}件`);

  const preRestoreManifestPath = saveManifest(currentHeads, "pre-restore");
  console.log(`[backfill] 復元前（現在）のメタデータmanifestを保存: ${preRestoreManifestPath}`);

  if (!APPLY) {
    console.log(`[backfill] dry-runのため書き込みは行っていません。実行するには --apply を指定してください。`);
    return;
  }

  if (process.env.CONFIRM_PRODUCTION_S3_BACKFILL !== "true") {
    throw new Error(
      "[backfill] CONFIRM_PRODUCTION_S3_BACKFILL=trueが設定されていません。本番S3への書き込みを伴うため、意図した実行であることを明示的に確認してください。"
    );
  }

  const failed: string[] = [];
  for (let i = 0; i < manifest.entries.length; i++) {
    const original = manifest.entries[i];
    const current = currentHeads[i];
    if (current.cacheControl === original.cacheControl) continue;
    try {
      await client.send(
        new CopyObjectCommand({
          ...buildCopyParams({ ...original, eTag: current.eTag }, original.cacheControl),
        })
      );
      console.log(`[backfill] 復元: ${original.key}`);
    } catch (e) {
      console.error(`[backfill] 復元失敗: ${original.key}`, e);
      failed.push(original.key);
    }
  }

  if (failed.length > 0) {
    console.error(`[backfill] ${failed.length}件の復元に失敗しました。`);
    process.exitCode = 1;
  } else {
    console.log(`[backfill] 復元完了。`);
  }
}

async function main(): Promise<void> {
  const client = getS3Client();

  if (RESTORE_MANIFEST_PATH) {
    await runRestore(client, RESTORE_MANIFEST_PATH);
  } else {
    await runBackfill(client);
  }
}

main().catch((e) => {
  console.error("[backfill] 失敗:", e);
  process.exitCode = 1;
});
