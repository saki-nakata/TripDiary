import { prisma } from "@/lib/prisma";
import { extractKeyFromUrl } from "@/lib/s3";
import { getBucketHostname } from "@/lib/s3-url";
import { resolveSeedMode } from "../prisma/assert-production-database";

// 本番S3から投稿画像・アバターの実体が失われていた事故（実装計画書/phase8.md 指摘①）の
// 再発検知用。DB（PostImage.url・User.image）が参照するURLが、実際にS3から取得できるかを
// 匿名HTTPSのHEADで確認する。読み取り専用（S3・DBともに一切変更しない）。
//
// 実行方法: pnpm exec dotenv -e .env.local -- pnpm audit:images
// 本番RDSへ到達できるEC2上での実行を想定。DATABASE_URLが本番RDSでなければ中断する
// （ローカルDBの画像URLはpublic/uploads/*の相対パスでextractKeyFromUrlがnullを返すため、
// ローカル接続のまま実行すると「対象0件・欠落0件」で誤って成功してしまう）。
//
// 匿名HTTPSのHEADを使う理由（IAM権限ではなく設計判断）:
// 1. バケットポリシーがuploads/*にs3:GetObjectをPrincipal:"*"で許可しているためクレデンシャル不要
// 2. ブラウザ・Next.js画像最適化が実際に使う経路（匿名HTTPS）そのものを検証できる。
//    署名付きHeadObjectはバケットポリシーが外れていても成功し得るため、この用途では偽陰性を生む

const CONCURRENCY = 8;
const TIMEOUT_MS = 10_000;

type ImageSource = "post" | "avatar";
type Reference = { source: ImageSource; id: string; label: string };
type Status = "ok" | "missing_or_forbidden" | "missing" | "invalid_content_type" | "unresolvable" | "unreachable";

type AuditTarget = {
  url: string;
  refs: Reference[];
};

type AuditResult = AuditTarget & {
  status: Status;
  detail: string;
};

async function collectTargets(): Promise<AuditTarget[]> {
  const [images, users] = await Promise.all([
    prisma.postImage.findMany({ select: { url: true, postId: true } }),
    prisma.user.findMany({ where: { image: { not: null } }, select: { id: true, nickname: true, image: true } }),
  ]);

  const byUrl = new Map<string, AuditTarget>();
  const addRef = (url: string, ref: Reference) => {
    const existing = byUrl.get(url);
    if (existing) {
      existing.refs.push(ref);
    } else {
      byUrl.set(url, { url, refs: [ref] });
    }
  };

  for (const img of images) {
    addRef(img.url, { source: "post", id: img.postId, label: `post:${img.postId}` });
  }
  for (const user of users) {
    // where句でimage: { not: null }としているためuser.imageは非null
    addRef(user.image as string, { source: "avatar", id: user.id, label: `user:${user.id}(${user.nickname})` });
  }

  return [...byUrl.values()];
}

async function headWithTimeout(url: string): Promise<{ status: number; contentType: string | null } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: controller.signal });
    return { status: res.status, contentType: res.headers.get("content-type") };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function auditTarget(target: AuditTarget): Promise<AuditResult> {
  const key = extractKeyFromUrl(target.url);
  if (key === null) {
    return { ...target, status: "unresolvable", detail: "extractKeyFromUrlが解析できないURL（想定外ホスト・percent-encoding不正等）" };
  }

  const hostname = getBucketHostname();
  const headUrl = `https://${hostname}/${key}`;
  const result = await headWithTimeout(headUrl);

  if (result === null) {
    return { ...target, status: "unreachable", detail: "通信失敗またはタイムアウト（判定不能。再実行を推奨）" };
  }
  if (result.status === 404) {
    return { ...target, status: "missing", detail: "404 Not Found" };
  }
  if (result.status === 403) {
    // ListBucketが非公開のため、欠落キーへの匿名アクセスは404ではなく403として見える
    return { ...target, status: "missing_or_forbidden", detail: "403（欠落または参照権限なし。ListBucket非公開のため区別不能）" };
  }
  if (result.status !== 200) {
    return { ...target, status: "unreachable", detail: `想定外のステータス: ${result.status}` };
  }
  if (!result.contentType || !result.contentType.startsWith("image/")) {
    return { ...target, status: "invalid_content_type", detail: `Content-Typeが画像形式でない: ${result.contentType ?? "(なし)"}` };
  }
  return { ...target, status: "ok", detail: "200 OK" };
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const mode = resolveSeedMode(databaseUrl);
  if (mode !== "production") {
    throw new Error(
      `[audit-s3-images] 接続先が本番RDSではありません（モード: ${mode}）。本番監査のみを対象とするため中断します。`
    );
  }

  const url = new URL(databaseUrl!);
  console.log(`[audit-s3-images] 開始（接続先: ${url.hostname} / ${url.pathname.replace(/^\//, "")}）`);

  const targets = await collectTargets();
  const postTargetCount = targets.filter((t) => t.refs.some((r) => r.source === "post")).length;
  const avatarTargetCount = targets.filter((t) => t.refs.some((r) => r.source === "avatar")).length;
  console.log(`[audit-s3-images] 対象URL: ${targets.length}件（投稿画像: ${postTargetCount}件、アバター: ${avatarTargetCount}件、重複排除済み）`);

  const results = await runWithConcurrency(targets, CONCURRENCY, auditTarget);

  const byStatus = new Map<Status, AuditResult[]>();
  for (const r of results) {
    const list = byStatus.get(r.status) ?? [];
    list.push(r);
    byStatus.set(r.status, list);
  }

  const ok = byStatus.get("ok")?.length ?? 0;
  console.log(`[audit-s3-images] 正常: ${ok}件`);

  const problemStatuses: Status[] = ["missing", "missing_or_forbidden", "invalid_content_type", "unresolvable", "unreachable"];
  let problemCount = 0;
  for (const status of problemStatuses) {
    const list = byStatus.get(status) ?? [];
    if (list.length === 0) continue;
    problemCount += list.length;
    console.log(`\n[audit-s3-images] ${status}: ${list.length}件`);
    for (const r of list) {
      console.log(`  ${r.url}`);
      console.log(`    detail: ${r.detail}`);
      console.log(`    参照元: ${r.refs.map((ref) => ref.label).join(", ")}`);
    }
  }

  if (problemCount > 0) {
    console.log(`\n[audit-s3-images] 異常: ${problemCount}件（unreachableは判定不能につき再実行を推奨）`);
    process.exitCode = 1;
  } else {
    console.log(`\n[audit-s3-images] 異常なし`);
  }
}

main()
  .catch((e) => {
    console.error("[audit-s3-images] 失敗:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
