import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { uploadObject } from "@/lib/s3";
import { toggleLikeService } from "@/lib/services/like.service";
import { createCommentService } from "@/lib/services/comment.service";
import { toggleFollowService } from "@/lib/services/follow.service";
import { isFollowing } from "@/lib/repositories/follow.repository";
import { toggleWishlistService } from "@/lib/services/wishlist.service";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import { resolveSeedMode, assertProductionSeedConfirmed } from "./assert-production-database";

// 6-B2: 本番DBへのシードデータ投入。「見せる完成品」として本番URLを直接ブラウズされても
// 成立する状態を作る。実装計画書/phase6.md 6-B2節を参照。
//
// 実行方法: pnpm exec dotenv -e .env.local -- pnpm exec tsx prisma/seed-production.ts
// 事前にPEXELS_API_KEYで pnpm seed:fetch-images を実行し、seed-images/ に画像プールを用意しておくこと。
// DRY_RUN=true で書き込みを行わず接続先・件数のみ表示する。CONFIRM_PRODUCTION_SEED=true が常に必須。
//
// 冪等性: すべての作成は決定的ID（`seed-`prefix）の存在確認→なければ作成、を徹底する。
// TRUNCATE・全件削除・一般ユーザーの更新は一切行わない。乱数（Math.random）は使わず、
// すべてインデックスに基づく決定的選択にする（再実行のたびに結果が変わらないようにするため）。

const GENERAL_USER_COUNT = 15;
const GENERAL_POST_COUNT = 60;
const GENERAL_LIKE_COUNT = 150;
const GENERAL_COMMENT_COUNT = 80;
const GENERAL_FOLLOW_COUNT = 25;
const GENERAL_PLAN_COUNT = 12;
const DEMO_POST_COUNT = 11;
// 確認用アカウントは動作確認（旅行レポート・行きたい・旅行プラン・訪問済みタブ）の
// 「見せる完成品」として、デモアカウント相当の件数を自分の投稿として持たせる
const CONFIRM_POST_COUNT = 9;
const CONFIRM_WISHLIST_COUNT = 7;

const SEED_IMAGES_DIR = path.join(process.cwd(), "seed-images");
const IMAGES_PER_CATEGORY = 3;
const DRY_RUN = process.env.DRY_RUN === "true";

// 排他実行。ensureLike/ensureWishlist/ensureFollow は「存在確認 → トグルAPI呼び出し」の2段構えのため、
// 2プロセスが同時に走ると、後発側が存在しないと判定した直後に先発側が作成し、後発側のトグルが
// それを解除してしまう（冪等どころか逆の結果になる）。ensureComment も Comment に一意制約が
// ないため重複作成され得る。通知を発行するにはService層（＝トグルAPI）を経由する必要があり
// 「存在しなければ作成」操作に置き換えられないため、シード実行そのものを排他化する。
//
// GET_LOCK は接続スコープのロックで、コネクションプール経由だと取得と解放が別接続になり得る。
// connection_limit=1 の専用クライアントを立て、取得・保持・解放を1本の接続に固定する。
const SEED_LOCK_NAME = "tripdiary:seed-production";
const SEED_LOCK_TIMEOUT_SECONDS = 10;

async function withSeedLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockUrl = new URL(process.env.DATABASE_URL!);
  lockUrl.searchParams.set("connection_limit", "1");
  const lockClient = new PrismaClient({ datasourceUrl: lockUrl.toString() });

  try {
    const rows = await lockClient.$queryRaw<
      { locked: number | bigint | null }[]
    >`SELECT GET_LOCK(${SEED_LOCK_NAME}, ${SEED_LOCK_TIMEOUT_SECONDS}) AS locked`;
    if (Number(rows[0]?.locked ?? 0) !== 1) {
      throw new Error(
        `[seed-production] 他のシード実行がロック（${SEED_LOCK_NAME}）を保持しています。同時実行するといいね・行きたい・フォローが解除される恐れがあるため中断します。`
      );
    }

    try {
      return await fn();
    } finally {
      await lockClient.$queryRaw`SELECT RELEASE_LOCK(${SEED_LOCK_NAME})`;
    }
  } finally {
    await lockClient.$disconnect();
  }
}

const DEMO_USER_ID = "seed-demo-user";
const DEMO_EMAIL = "demo@tripdiary.example";
const CONFIRM_USER_ID = "seed-confirm-user";
const CONFIRM_EMAIL = "confirm@tripdiary.example";
// 確認用アカウントは isProtected: true で保護されるため固定パスワードでよい（README.mdに明記する）
const CONFIRM_PASSWORD = "TripDiary-Confirm-2026-Seed";

const POST_TITLES = [
  "絶景スポットを訪れました",
  "地元グルメを堪能しました",
  "静かな時間を過ごせる場所",
  "家族旅行におすすめの一日",
  "写真映えする観光地",
  "隠れた名所を発見",
  "定番だけど外せない場所",
  "雨の日でも楽しめるスポット",
  "歴史を感じる街歩き",
  "季節を感じる旅",
] as const;

const POST_BODIES = [
  "天気にも恵まれて、とても良い旅行になりました。また訪れたいです。",
  "混雑していましたが、それでも訪れる価値のある場所でした。",
  "地元の人おすすめの穴場スポットで、静かにゆっくり過ごせました。",
  "食事が美味しく、雰囲気も良かったのでまた来たいと思います。",
  "アクセスは少し不便でしたが、景色は最高でした。",
] as const;

const COMMENT_BODIES = [
  "素敵な投稿ですね！参考にします。",
  "私も行ったことがあります、懐かしいです。",
  "写真がとても綺麗ですね。",
  "今度行ってみたいと思います。",
  "詳しい情報をありがとうございます！",
] as const;

const PLAN_TITLES = [
  "週末弾丸旅行",
  "家族旅行の計画",
  "一人旅プラン",
  "友人との旅行",
  "記念日の旅",
  "食べ歩きの旅",
] as const;

function padded(n: number, width = 3): string {
  return String(n).padStart(width, "0");
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[((index % arr.length) + arr.length) % arr.length];
}

function generalVisitedAt(index: number): Date {
  const now = new Date();
  const yearsAgo = index % 2;
  const month = ((index * 3) % 12) + 1;
  const day = ((index * 11) % 27) + 1;
  return new Date(now.getFullYear() - yearsAgo, month - 1, day);
}

// デモアカウントは「複数年」の分散を明確にするため、一般層より広い範囲(0〜2年前)に振る
function demoVisitedAt(index: number): Date {
  const now = new Date();
  const yearsAgo = index % 3;
  const month = ((index * 5) % 12) + 1;
  const day = ((index * 7) % 27) + 1;
  return new Date(now.getFullYear() - yearsAgo, month - 1, day);
}

function planStartDate(seed: number): Date {
  const now = new Date();
  const yearsAgo = seed % 2;
  const month = ((seed * 5) % 12) + 1;
  const day = ((seed * 9) % 27) + 1;
  return new Date(now.getFullYear() - yearsAgo, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function generateRandomPassword(): string {
  return randomBytes(18).toString("base64url");
}

function getSeedImageBuffer(category: string, slotIndex: number): { buffer: Buffer; ext: string } {
  const fileIndex = (((slotIndex % IMAGES_PER_CATEGORY) + IMAGES_PER_CATEGORY) % IMAGES_PER_CATEGORY) + 1;
  const filePath = path.join(SEED_IMAGES_DIR, category, `${padded(fileIndex, 2)}.jpg`);
  if (!existsSync(filePath)) {
    throw new Error(
      `[seed-production] 画像が見つかりません: ${filePath}（先に pnpm seed:fetch-images を実行してください）`
    );
  }
  return { buffer: readFileSync(filePath), ext: "jpg" };
}

// 戻り値は「今回のこの呼び出しで実際に作成したか」。デモ/確認用アカウントのパスワードは
// 呼び出し側でこの戻り値を見てから生成・表示する（既存ユーザーに対して無意味な新パスワードを
// 表示してしまう=実際のDB上のパスワードと食い違う、というバグを避けるため）
async function ensureUser(
  id: string,
  email: string,
  nickname: string,
  password: string | null,
  isProtected = false
): Promise<boolean> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (existing) return false;
  await prisma.user.create({ data: { id, email, nickname, password, isProtected } });
  console.log(`[seed-production] ユーザー作成: ${id}`);
  return true;
}

async function ensurePost(params: {
  id: string;
  authorId: string;
  title: string;
  body: string;
  category: string;
  location: string;
  rating: number;
  visitedAt: Date;
  imageCount: number;
  imageSeed: number;
}): Promise<void> {
  const existing = await prisma.post.findUnique({ where: { id: params.id } });
  if (existing) return;

  // 元画像ファイルを複数投稿で使い回す場合でも、S3オブジェクトは投稿ごとに個別に
  // アップロードする（phase6.md:160「1つのS3オブジェクトを複数投稿で共有参照しない」）。
  // 既にアップロード済みの同一画像のURLを他の投稿と共有することはしない
  const imageUrls: string[] = [];
  for (let k = 0; k < params.imageCount; k++) {
    const { buffer, ext } = getSeedImageBuffer(params.category, params.imageSeed + k);
    const key = `uploads/${params.authorId}/seed/${params.id}/${k}.${ext}`;
    const url = await uploadObject(key, buffer, "image/jpeg");
    imageUrls.push(url);
  }

  await prisma.post.create({
    data: {
      id: params.id,
      title: params.title,
      body: params.body,
      category: params.category,
      location: params.location,
      rating: params.rating,
      visitedAt: params.visitedAt,
      authorId: params.authorId,
      ...(imageUrls.length > 0 && {
        images: { create: imageUrls.map((url, displayOrder) => ({ url, displayOrder })) },
      }),
      // 自分の投稿は必ず訪問済みとして扱う本番の挙動（post.repository.tsのcreatePost）を踏襲
      visited: { create: { userId: params.authorId } },
    },
  });
  console.log(`[seed-production] 投稿作成: ${params.id}（画像${imageUrls.length}枚）`);
}

async function ensurePlan(params: {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  startDate: Date | null;
  endDate: Date | null;
  spotPostIds: string[];
}): Promise<void> {
  const existing = await prisma.plan.findUnique({ where: { id: params.id } });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    await tx.plan.create({
      data: {
        id: params.id,
        userId: params.userId,
        title: params.title,
        completed: params.completed,
        startDate: params.startDate,
        endDate: params.endDate,
      },
    });
    if (params.spotPostIds.length > 0) {
      await tx.planSpot.createMany({
        data: params.spotPostIds.map((postId, displayOrder) => ({
          id: `${params.id}-spot-${displayOrder + 1}`,
          planId: params.id,
          postId,
          displayOrder,
        })),
      });
    }
  });
  console.log(`[seed-production] プラン作成: ${params.id}`);
}

// Like・Followは複合主キー自体が冪等判定になる。Commentには自然な複合ユニーク制約がないため
// authorId+postId+bodyの組み合わせで存在確認する（decisive IDは付与しない。理由は実装計画書参照）。
//
// 以下4関数はいずれも「存在確認 → Service層の呼び出し」であり、単体では並行実行に耐えない。
// 単一プロセス内では直列にawaitしており、プロセス間の同時実行は withSeedLock() が排他化する。
async function ensureLike(userId: string, postId: string): Promise<void> {
  const existing = await prisma.like.findUnique({ where: { userId_postId: { userId, postId } } });
  if (existing) return;
  await toggleLikeService(userId, postId);
}

async function ensureWishlist(userId: string, postId: string): Promise<void> {
  const existing = await prisma.wishlist.findUnique({ where: { userId_postId: { userId, postId } } });
  if (existing) return;
  await toggleWishlistService(userId, postId);
}

async function ensureComment(authorId: string, postId: string, body: string): Promise<void> {
  const existing = await prisma.comment.findFirst({ where: { authorId, postId, body } });
  if (existing) return;
  await createCommentService(authorId, postId, body);
}

async function ensureFollow(followerId: string, followingId: string): Promise<void> {
  const existing = await isFollowing(followerId, followingId);
  if (existing) return;
  await toggleFollowService(followerId, followingId);
}

async function printDryRunSummary(mode: string, host: string, database: string): Promise<void> {
  const [existingUsers, existingPosts, existingPlans] = await Promise.all([
    prisma.user.count({ where: { id: { startsWith: "seed-" } } }),
    prisma.post.count({ where: { id: { startsWith: "seed-" } } }),
    prisma.plan.count({ where: { id: { startsWith: "seed-" } } }),
  ]);

  console.log(`[seed-production] DRY RUN（モード: ${mode}）`);
  console.log(`  接続先: ${host} / ${database}`);
  console.log(`  既存のシード関連ユーザー: ${existingUsers}件`);
  console.log(`  既存のシード関連投稿: ${existingPosts}件`);
  console.log(`  既存のシード関連プラン: ${existingPlans}件`);
  console.log(`  作成目標（既に存在する分はスキップされます）:`);
  console.log(`    ユーザー: 一般${GENERAL_USER_COUNT}名＋デモ1名＋確認用1名`);
  console.log(`    投稿: 一般${GENERAL_POST_COUNT}件＋デモ${DEMO_POST_COUNT}件＋確認用${CONFIRM_POST_COUNT}件`);
  console.log(`    いいね: 最大${GENERAL_LIKE_COUNT}件、コメント: 最大${GENERAL_COMMENT_COUNT}件、フォロー: 最大${GENERAL_FOLLOW_COUNT}件`);
  console.log(`    プラン: 一般${GENERAL_PLAN_COUNT}件＋デモ2件＋確認用2件`);
  console.log(`    確認用アカウントの行きたい: 最大${CONFIRM_WISHLIST_COUNT}件`);
  console.log(`[seed-production] DRY RUNのため書き込みは行っていません。`);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const mode = resolveSeedMode(databaseUrl);
  assertProductionSeedConfirmed();

  const url = new URL(databaseUrl!);
  const database = url.pathname.replace(/^\//, "");

  if (DRY_RUN) {
    await printDryRunSummary(mode, url.hostname, database);
    return;
  }

  console.log(`[seed-production] 開始（モード: ${mode}、接続先: ${url.hostname} / ${database}）`);

  // 書き込みフェーズ全体を排他化する（同時実行でトグル操作が打ち消し合うのを防ぐ）
  await withSeedLock(runSeed);
}

async function runSeed(): Promise<void> {
  // 1. 一般ユーザー（ログインさせる想定がないため password は null）
  for (let i = 0; i < GENERAL_USER_COUNT; i++) {
    await ensureUser(
      `seed-user-${padded(i + 1)}`,
      `seed-general-${padded(i + 1)}@example.com`,
      `旅人${padded(i + 1, 2)}`,
      null
    );
  }
  const generalUserIds = Array.from({ length: GENERAL_USER_COUNT }, (_, i) => `seed-user-${padded(i + 1)}`);

  // 2. 一般投稿（約8割に画像1〜3枚。カテゴリを問わずPexelsで各カテゴリの実写を用意済み）
  const generalPosts: { id: string; authorId: string }[] = [];
  for (let i = 0; i < GENERAL_POST_COUNT; i++) {
    const authorId = pick(generalUserIds, i);
    const id = `seed-post-g-${padded(i + 1)}`;
    const category = pick(CATEGORIES, i);
    const hasImage = i % 5 !== 0;
    await ensurePost({
      id,
      authorId,
      title: pick(POST_TITLES, i),
      body: pick(POST_BODIES, i),
      category,
      location: pick(LOCATIONS, i),
      rating: (i % 5) + 1,
      visitedAt: generalVisitedAt(i),
      imageCount: hasImage ? 1 + (i % 3) : 0,
      imageSeed: i,
    });
    generalPosts.push({ id, authorId });
  }

  // 3. デモアカウント（パスワードはランダム生成、標準出力にのみ表示しリポジトリには残さない）。
  // ensureUserが実際に作成したときだけ末尾でこのパスワードを表示する（既存の場合、再生成した
  // このパスワードは実際のDB上のパスワードとは食い違うため表示しない）
  const demoPassword = generateRandomPassword();
  const demoCreated = await ensureUser(DEMO_USER_ID, DEMO_EMAIL, "TripDiary公式デモ", await hashPassword(demoPassword));

  // 4. デモ投稿（複数年・複数都道府県・複数カテゴリに分散、大半に画像あり）
  const demoPosts: { id: string; authorId: string }[] = [];
  for (let i = 0; i < DEMO_POST_COUNT; i++) {
    const id = `seed-post-demo-${padded(i + 1, 2)}`;
    const category = pick(CATEGORIES, i * 2);
    const hasImage = i % 10 !== 9;
    await ensurePost({
      id,
      authorId: DEMO_USER_ID,
      title: pick(POST_TITLES, i + 20),
      body: pick(POST_BODIES, i + 3),
      category,
      location: pick(LOCATIONS, i * 5 + 2),
      rating: (i % 5) + 1,
      visitedAt: demoVisitedAt(i),
      imageCount: hasImage ? 1 + (i % 3) : 0,
      imageSeed: i + 1,
    });
    demoPosts.push({ id, authorId: DEMO_USER_ID });
  }

  // 5. 確認用アカウント（isProtected: true。changePasswordService/changeEmailServiceが
  //    既にこのフラグを見てパスワード・メール変更を拒否するため、アプリ側コード変更は不要）。
  // パスワードは固定値のためデモアカウントと違い再生成の問題は起きない（README.mdに記載）
  await ensureUser(CONFIRM_USER_ID, CONFIRM_EMAIL, "確認用アカウント", await hashPassword(CONFIRM_PASSWORD), true);

  // 6. 一般プラン（PlanSpotで自分自身の投稿の一部を紐付ける）
  for (let j = 0; j < GENERAL_PLAN_COUNT; j++) {
    const userId = pick(generalUserIds, j);
    const ownPosts = generalPosts.filter((p) => p.authorId === userId);
    const completed = j % 3 === 0;
    const startDate = completed || j % 2 === 0 ? planStartDate(j) : null;
    const endDate = completed && startDate ? addDays(startDate, 2 + (j % 4)) : null;
    await ensurePlan({
      id: `seed-plan-g-${padded(j + 1, 2)}`,
      userId,
      title: pick(PLAN_TITLES, j),
      completed,
      startDate,
      endDate,
      spotPostIds: ownPosts.slice(0, 2).map((p) => p.id),
    });
  }

  // 7. デモプラン（完了済み1件＋計画中1件。旅行レポートの年別集計はcompleted&&startDateの年で
  //    行われるため、完了済み1件は必ずstartDateを設定する）
  const demoCompletedStart = planStartDate(1);
  await ensurePlan({
    id: "seed-plan-demo-completed",
    userId: DEMO_USER_ID,
    title: "思い出の旅",
    completed: true,
    startDate: demoCompletedStart,
    endDate: addDays(demoCompletedStart, 3),
    spotPostIds: demoPosts.slice(0, 3).map((p) => p.id),
  });
  await ensurePlan({
    id: "seed-plan-demo-active",
    userId: DEMO_USER_ID,
    title: "次の旅の計画",
    completed: false,
    startDate: null,
    endDate: null,
    spotPostIds: demoPosts.slice(3, 5).map((p) => p.id),
  });

  // 8. いいね・コメント・フォロー（Service層経由。対象の一部をデモアカウントへ意図的に向けることで
  //    通知の事前投入〔phase6.md 2番目の箇条書き〕を自然に達成する）
  const allPosts = [...generalPosts, ...demoPosts];
  const followTargets = [...generalUserIds, DEMO_USER_ID];

  for (let i = 0; i < GENERAL_LIKE_COUNT; i++) {
    const targetPost = pick(allPosts, i);
    let actorIdx = i % GENERAL_USER_COUNT;
    if (generalUserIds[actorIdx] === targetPost.authorId) actorIdx = (actorIdx + 1) % GENERAL_USER_COUNT;
    await ensureLike(generalUserIds[actorIdx], targetPost.id);
  }

  for (let i = 0; i < GENERAL_COMMENT_COUNT; i++) {
    const targetPost = pick(allPosts, i + 7);
    const authorId = pick(generalUserIds, i);
    await ensureComment(authorId, targetPost.id, pick(COMMENT_BODIES, i));
  }

  for (let i = 0; i < GENERAL_FOLLOW_COUNT; i++) {
    const followerId = pick(generalUserIds, i);
    let targetIdx = (i * 3) % followTargets.length;
    if (followTargets[targetIdx] === followerId) targetIdx = (targetIdx + 1) % followTargets.length;
    await ensureFollow(followerId, followTargets[targetIdx]);
  }

  // 9. 確認用アカウントの投稿（すべて画像付き。旅行レポート・訪問済みタブの動作確認用に
  //    複数年へ分散させる。自分の投稿は必ず訪問済みとして扱う本番の挙動により訪問済みタブも自動で埋まる）
  const confirmPosts: { id: string; authorId: string }[] = [];
  for (let i = 0; i < CONFIRM_POST_COUNT; i++) {
    const id = `seed-post-confirm-${padded(i + 1, 2)}`;
    await ensurePost({
      id,
      authorId: CONFIRM_USER_ID,
      title: pick(POST_TITLES, i + 40),
      body: pick(POST_BODIES, i + 1),
      category: pick(CATEGORIES, i * 3 + 1),
      location: pick(LOCATIONS, i * 7 + 3),
      rating: (i % 5) + 1,
      visitedAt: demoVisitedAt(i + 1),
      imageCount: 1 + (i % 3),
      imageSeed: i + 2,
    });
    confirmPosts.push({ id, authorId: CONFIRM_USER_ID });
  }

  // 10. 確認用アカウントのプラン（完了済み1件＋進行中1件。完了済みは旅行レポートの年別集計に
  //     反映されるよう必ずstartDateを設定する）
  const confirmCompletedStart = planStartDate(3);
  await ensurePlan({
    id: "seed-plan-confirm-completed",
    userId: CONFIRM_USER_ID,
    title: "確認用の旅の記録",
    completed: true,
    startDate: confirmCompletedStart,
    endDate: addDays(confirmCompletedStart, 2),
    spotPostIds: confirmPosts.slice(0, 3).map((p) => p.id),
  });
  await ensurePlan({
    id: "seed-plan-confirm-active",
    userId: CONFIRM_USER_ID,
    title: "確認用の次の旅",
    completed: false,
    startDate: null,
    endDate: null,
    spotPostIds: confirmPosts.slice(3, 5).map((p) => p.id),
  });

  // 11. 確認用アカウントの行きたい（一般・デモユーザーの投稿へWishlistを付与）
  const confirmWishlistTargets = [...generalPosts.slice(0, 4), ...demoPosts.slice(0, 3)].slice(
    0,
    CONFIRM_WISHLIST_COUNT
  );
  for (const target of confirmWishlistTargets) {
    await ensureWishlist(CONFIRM_USER_ID, target.id);
  }

  console.log("[seed-production] 完了");
  if (demoCreated) {
    console.log(
      `[seed-production] デモアカウント: ${DEMO_EMAIL} / パスワード: ${demoPassword}（この出力にのみ表示、保存されません。控えてください）`
    );
  } else {
    console.log(`[seed-production] デモアカウント: ${DEMO_EMAIL}（既存。パスワードは初回作成時のまま変更されていません）`);
  }
  console.log(`[seed-production] 確認用アカウント: ${CONFIRM_EMAIL} / パスワード: README.md参照`);
}

main()
  .catch((e) => {
    console.error("[seed-production] 失敗:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
