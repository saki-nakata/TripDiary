import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { toggleLike } from "@/lib/repositories/like.repository";
import { createComment } from "@/lib/repositories/comment.repository";
import { toggleFollow } from "@/lib/repositories/follow.repository";
import { createNotification } from "@/lib/repositories/notification.repository";
import { CATEGORIES, LOCATIONS } from "@/lib/constants";
import { assertPerfDatabase, assertPerfTruncateConfirmed, PERF_DATABASE_ALLOWLIST } from "./assert-perf-database";

const USER_COUNT = 60;
const HEAVY_USER_COUNT = 5;
const HEAVY_USER_POST_RANGE: [number, number] = [160, 320];
const REGULAR_USER_POST_RANGE: [number, number] = [25, 55];
const LIKE_COUNT = 10000;
const COMMENT_COUNT = 10000;
const FOLLOW_COUNT = 300;
const NOTIFICATION_COUNT = 3000;
// GATE-22種類B（コメント・フォロワー/フォロー中のcursorページング）の負荷試験対象ユーザーに、
// 「投稿したコメント」「受け取ったコメント」「フォロワー」「フォロー中」をそれぞれ最低何件
// 決定的に割り当てるか。既定limit=50を1件でも超えれば1ページ目でhasMore=trueになるが、
// 通常のfollowScenario/interactionScenarioが対象ユーザーを「現在のVU」または「隣のユーザー」として
// 巻き込んだ場合、フォロー関係はtoggle（1件の辺の有無を反転）されるため±1件だけ変動しうる
// （実測：Smokeでfollowingが51→50に変動しhasMore判定が失敗した）。この変動を吸収できるよう、
// 単なる境界値+1ではなく余裕を持った値を設定する（総件数の内数として割り当て、残りはランダム分配）
const PAGINATION_MIN_COUNT = 56;
const IMAGE_POST_RATIO = 0.8;
const SHARED_PASSWORD = "perf-test-password-1234";
const CONCURRENCY = 20;

const UPLOADS_DIR = path.resolve(process.cwd(), "public/uploads");
const K6_DATA_DIR = path.resolve(process.cwd(), "performance/k6/data");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// createdAtが直近2年に分散しつつ直近寄りになるよう、2乗分布で経過日数を決める
function randomVisitedAtWithinLastYears(years: number): Date {
  const now = Date.now();
  const maxAgeMs = years * 365 * 24 * 60 * 60 * 1000;
  const skewed = Math.pow(Math.random(), 2);
  const ageMs = skewed * maxAgeMs;
  return new Date(now - ageMs);
}

function isDeadlockError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return /deadlock/i.test(message) || (e as { code?: string })?.code === "P2034";
}

async function withDeadlockRetry<T>(fn: () => Promise<T>, retries = 5): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries || !isDeadlockError(e)) throw e;
      await new Promise((resolve) => setTimeout(resolve, 50 + randomInt(0, 100)));
    }
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function runNext(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) return;
    await worker(items[index]);
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
}

function groupByPostId<T extends { postId: string }>(tasks: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const task of tasks) {
    const group = map.get(task.postId);
    if (group) group.push(task);
    else map.set(task.postId, [task]);
  }
  return map;
}

async function cleanDatabase() {
  // 書き込み（TRUNCATE）より前に、接続先が必ずperf専用DBであることを検証する。
  // 1) URL文字列のみでの検証（DB接続なし） 2) 実接続後にSELECT DATABASE()で再確認、の2段構え。
  assertPerfDatabase(process.env.DATABASE_URL);
  assertPerfTruncateConfirmed();

  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT DATABASE() as db`;
  if (db !== PERF_DATABASE_ALLOWLIST.database) {
    throw new Error(
      `[seed] 実接続したデータベース名（${db}）がperf専用DB（${PERF_DATABASE_ALLOWLIST.database}）と一致しません。`
    );
  }

  console.log("[seed] クリーンアップ中...");
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  const tables = [
    "notifications",
    "plan_spots",
    "plans",
    "visited",
    "wishlists",
    "follows",
    "likes",
    "comments",
    "post_images",
    "posts",
    "accounts",
    "verification_tokens",
    "users",
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
}

async function seedUsers() {
  console.log(`[seed] ユーザー${USER_COUNT}名を作成中...`);
  const hashedPassword = await hashPassword(SHARED_PASSWORD);
  const users: { id: string; email: string; nickname: string }[] = [];
  for (let i = 1; i <= USER_COUNT; i++) {
    const suffix = String(i).padStart(3, "0");
    const email = `perf_${suffix}@example.com`;
    const nickname = `PerfUser${suffix}`;
    const user = await prisma.user.create({
      data: { email, nickname, password: hashedPassword },
      select: { id: true, email: true, nickname: true },
    });
    users.push(user);
  }
  return users;
}

async function loadPlaceholderImagePool(): Promise<string[]> {
  try {
    const entries = await readdir(UPLOADS_DIR);
    const images = entries.filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()));
    if (images.length === 0) {
      console.warn(
        `[seed] 警告: ${UPLOADS_DIR} に画像ファイルが見つかりません。投稿にPostImageは付与されません（LCP計測が非現実的に軽くなります）。事前に数枚のプレースホルダ画像を配置してください。`
      );
    }
    return images;
  } catch {
    console.warn(`[seed] 警告: ${UPLOADS_DIR} を読み取れません。投稿にPostImageは付与されません。`);
    return [];
  }
}

const POST_TITLES = [
  "絶景スポットを訪れました",
  "地元グルメを堪能",
  "静かな時間を過ごせる場所",
  "家族旅行におすすめ",
  "写真映えする観光地",
  "隠れた名所を発見",
  "定番だけど外せない場所",
  "雨の日でも楽しめるスポット",
];

const POST_BODY_SAMPLES = [
  "天気にも恵まれて、とても良い旅行になりました。また訪れたいです。",
  "混雑していましたが、それでも訪れる価値のある場所でした。",
  "地元の人おすすめの穴場スポットで、静かにゆっくり過ごせました。",
  "食事が美味しく、雰囲気も良かったのでまた来たいと思います。",
  "アクセスは少し不便でしたが、景色は最高でした。",
];

async function seedPosts(users: { id: string }[], paginationTargetUserId: string) {
  console.log("[seed] 投稿を作成中...");
  const imagePool = await loadPlaceholderImagePool();
  const heavyUsers = users.slice(0, HEAVY_USER_COUNT);
  const regularUsers = users.slice(HEAVY_USER_COUNT);

  const authorAssignments: string[] = [];
  for (const user of heavyUsers) {
    const count = randomInt(...HEAVY_USER_POST_RANGE);
    for (let i = 0; i < count; i++) authorAssignments.push(user.id);
  }
  for (const user of regularUsers) {
    const count = randomInt(...REGULAR_USER_POST_RANGE);
    for (let i = 0; i < count; i++) authorAssignments.push(user.id);
  }

  const shuffledAuthors = shuffle(authorAssignments);
  const postIds: string[] = [];
  const targetPostIds: string[] = [];

  await runWithConcurrency(shuffledAuthors, CONCURRENCY, async (authorId) => {
    const hasImages = imagePool.length > 0 && Math.random() < IMAGE_POST_RATIO;
    const imageUrls = hasImages
      ? Array.from({ length: randomInt(1, 3) }, () => `/uploads/${pick(imagePool)}`)
      : [];

    const post = await prisma.post.create({
      data: {
        title: pick(POST_TITLES),
        body: pick(POST_BODY_SAMPLES),
        category: pick(CATEGORIES),
        location: pick(LOCATIONS),
        rating: Math.random() < 0.8 ? randomInt(1, 5) : null,
        visitedAt: randomVisitedAtWithinLastYears(2),
        authorId,
        createdAt: randomVisitedAtWithinLastYears(2),
        ...(imageUrls.length > 0 && {
          images: { create: imageUrls.map((url, displayOrder) => ({ url, displayOrder })) },
        }),
        // 自分の投稿は必ず訪問済みとして扱う本番の挙動（post.repository.tsのcreatePost）を
        // 直接prisma呼び出しでも再現し、シードデータの整合性を保つ
        visited: { create: { userId: authorId } },
      },
      select: { id: true },
    });
    postIds.push(post.id);
    if (authorId === paginationTargetUserId) targetPostIds.push(post.id);
  });

  console.log(`[seed] 投稿${postIds.length}件を作成しました（うちページング検証対象ユーザーの投稿${targetPostIds.length}件）`);
  return { postIds, targetPostIds };
}

async function seedLikes(users: { id: string }[], postIds: string[]) {
  console.log(`[seed] いいね${LIKE_COUNT}件を作成中...`);
  const seen = new Set<string>();
  const tasks: { userId: string; postId: string }[] = [];

  // 人気投稿を作るため、投稿の一部を重み付き対象として複数回選ばれやすくする
  const popularPosts = shuffle(postIds).slice(0, Math.max(1, Math.floor(postIds.length * 0.1)));

  let guard = 0;
  while (tasks.length < LIKE_COUNT && guard < LIKE_COUNT * 20) {
    guard++;
    const postId = Math.random() < 0.6 ? pick(popularPosts) : pick(postIds);
    const userId = pick(users).id;
    const key = `${userId}:${postId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tasks.push({ userId, postId });
  }

  const grouped = groupByPostId(tasks);
  const entries = Array.from(grouped.entries());
  let done = 0;

  await runWithConcurrency(entries, CONCURRENCY, async ([, postTasks]) => {
    for (const task of postTasks) {
      await withDeadlockRetry(() => toggleLike(task.userId, task.postId));
      done++;
    }
  });

  console.log(`[seed] いいね${done}件を作成しました`);
}

const COMMENT_BODIES = [
  "素敵な投稿ですね！参考にします。",
  "私も行ったことがあります、懐かしいです。",
  "写真がとても綺麗ですね。",
  "今度行ってみたいと思います。",
  "詳しい情報をありがとうございます！",
];

async function seedComments(
  users: { id: string }[],
  postIds: string[],
  paginationTargetUserId: string,
  paginationTargetPostIds: string[]
) {
  console.log(`[seed] コメント${COMMENT_COUNT}件を作成中...`);
  const tasks: { authorId: string; postId: string; body: string }[] = [];

  // ページング検証対象ユーザーに、「投稿したコメント」「受け取ったコメント」をそれぞれ
  // PAGINATION_MIN_COUNT件以上、決定的に割り当てる（COMMENT_COUNTの内数。残りだけランダム分配）
  const targetPostIdSet = new Set(paginationTargetPostIds);
  const otherPostIds = postIds.filter((id) => !targetPostIdSet.has(id));
  const postIdsForOwnComments = otherPostIds.length > 0 ? otherPostIds : postIds;
  for (let i = 0; i < PAGINATION_MIN_COUNT; i++) {
    tasks.push({ authorId: paginationTargetUserId, postId: pick(postIdsForOwnComments), body: pick(COMMENT_BODIES) });
  }
  const otherUsers = users.filter((u) => u.id !== paginationTargetUserId);
  const postIdsForReceivedComments = paginationTargetPostIds.length > 0 ? paginationTargetPostIds : postIds;
  for (let i = 0; i < PAGINATION_MIN_COUNT; i++) {
    tasks.push({ authorId: pick(otherUsers).id, postId: pick(postIdsForReceivedComments), body: pick(COMMENT_BODIES) });
  }

  for (let i = tasks.length; i < COMMENT_COUNT; i++) {
    tasks.push({ authorId: pick(users).id, postId: pick(postIds), body: pick(COMMENT_BODIES) });
  }

  const grouped = groupByPostId(tasks);
  const entries = Array.from(grouped.entries());
  let done = 0;

  await runWithConcurrency(entries, CONCURRENCY, async ([postId, postTasks]) => {
    for (const task of postTasks) {
      await withDeadlockRetry(() => createComment({ postId, authorId: task.authorId, body: task.body }));
      done++;
    }
  });

  console.log(`[seed] コメント${done}件を作成しました`);
}

async function seedFollows(users: { id: string }[], paginationTargetUserId: string) {
  console.log(`[seed] フォロー${FOLLOW_COUNT}件を作成中...`);
  const seen = new Set<string>();
  let done = 0;

  // ページング検証対象ユーザーに、「フォロワー」「フォロー中」をそれぞれPAGINATION_MIN_COUNT人以上、
  // 決定的に割り当てる（FOLLOW_COUNTの内数。残りだけランダム分配）
  const others = users.filter((u) => u.id !== paginationTargetUserId);
  const followerCandidates = shuffle(others).slice(0, PAGINATION_MIN_COUNT);
  for (const follower of followerCandidates) {
    const key = `${follower.id}:${paginationTargetUserId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await toggleFollow(follower.id, paginationTargetUserId);
    done++;
  }
  const followingCandidates = shuffle(others).slice(0, PAGINATION_MIN_COUNT);
  for (const followee of followingCandidates) {
    const key = `${paginationTargetUserId}:${followee.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await toggleFollow(paginationTargetUserId, followee.id);
    done++;
  }

  let guard = 0;
  while (done < FOLLOW_COUNT && guard < FOLLOW_COUNT * 20) {
    guard++;
    const follower = pick(users);
    const following = pick(users);
    if (follower.id === following.id) continue;
    const key = `${follower.id}:${following.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await toggleFollow(follower.id, following.id);
    done++;
  }

  console.log(`[seed] フォロー${done}件を作成しました`);
}

async function seedNotifications(users: { id: string }[], postIds: string[]) {
  console.log(`[seed] 通知${NOTIFICATION_COUNT}件を作成中...`);
  const tasks: Parameters<typeof createNotification>[0][] = [];

  for (let i = 0; i < NOTIFICATION_COUNT; i++) {
    const recipient = pick(users);
    let sender = pick(users);
    while (sender.id === recipient.id) sender = pick(users);

    const type = pick(["like", "comment", "follow"] as const);
    tasks.push({
      userId: recipient.id,
      fromUserId: sender.id,
      type,
      ...(type !== "follow" && { postId: pick(postIds) }),
      ...(type === "comment" && { commentBody: pick(COMMENT_BODIES) }),
    });
  }

  let done = 0;
  await runWithConcurrency(tasks, CONCURRENCY, async (data) => {
    const notification = await createNotification(data);
    // 3割は未読のまま、7割は既読にして`unread-count`の値に現実的なばらつきを持たせる
    if (Math.random() < 0.7) {
      await prisma.notification.update({ where: { id: notification.id }, data: { read: true } });
    }
    done++;
  });

  console.log(`[seed] 通知${done}件を作成しました`);
}

async function writeOutputFiles(
  users: { id: string; email: string; nickname: string }[],
  postIds: string[],
  paginationTargetUserId: string
) {
  console.log("[seed] 生成物を書き出し中...");
  await mkdir(K6_DATA_DIR, { recursive: true });

  // idを含めるのは、フォロートグルのシナリオがuserForCurrentVu()とは別のユーザーを
  // 自分自身と誤ってフォローしないよう、決定的に「別のユーザー」を選ぶために必要なため
  const csvLines = [
    "id,email,password,nickname",
    ...users.map((u) => `${u.id},${u.email},${SHARED_PASSWORD},${u.nickname}`),
  ];
  await writeFile(path.join(K6_DATA_DIR, "users.csv"), csvLines.join("\n") + "\n", "utf-8");

  const topLiked = await prisma.post.findFirst({
    orderBy: { likeCount: "desc" },
    select: { id: true, authorId: true },
  });
  const samplePostId = postIds[randomInt(0, postIds.length - 1)];

  // mostLikedPostAuthorIdは、interactionScenarioが「自分の投稿にはいいねできない」という
  // 本物の業務ルール（like.service.tsのForbiddenError）による403を、サーバー不具合と誤検知
  // しないようにするため（投稿者自身が実行するVUではいいねをスキップする）
  await writeFile(
    path.join(K6_DATA_DIR, "sample-post-ids.json"),
    JSON.stringify(
      {
        mostLikedPostId: topLiked?.id ?? samplePostId,
        mostLikedPostAuthorId: topLiked?.authorId ?? null,
        samplePostId,
        // GATE-22種類B（コメント・フォロワー/フォロー中のcursorページング）の負荷試験対象。
        // 投稿したコメント・受け取ったコメント・フォロワー・フォロー中をそれぞれ51件以上
        // 決定的に保証したユーザー（verifyPaginationTargetCounts参照）
        paginationTargetUserId,
      },
      null,
      2
    ) + "\n",
    "utf-8"
  );

  console.log(`[seed] performance/k6/data/users.csv と sample-post-ids.json を書き出しました`);
}

async function verifyCounterIntegrity() {
  const [likeAgg, likeCount, commentAgg, commentCount] = await Promise.all([
    prisma.post.aggregate({ _sum: { likeCount: true } }),
    prisma.like.count(),
    prisma.post.aggregate({ _sum: { commentCount: true } }),
    prisma.comment.count(),
  ]);

  const sumLikeCount = likeAgg._sum.likeCount ?? 0;
  const sumCommentCount = commentAgg._sum.commentCount ?? 0;

  console.log(`[seed] 整合性チェック: SUM(likeCount)=${sumLikeCount} / COUNT(likes)=${likeCount}`);
  console.log(`[seed] 整合性チェック: SUM(commentCount)=${sumCommentCount} / COUNT(comments)=${commentCount}`);

  if (sumLikeCount !== likeCount) throw new Error("likeCountの整合性チェックに失敗しました");
  if (sumCommentCount !== commentCount) throw new Error("commentCountの整合性チェックに失敗しました");
}

// GATE-22種類B（コメント・フォロワー/フォロー中のcursorページング）の負荷試験対象ユーザーが、
// 4条件すべてでPAGINATION_MIN_COUNT件以上を満たすことをシード完了時に検証する。
// 満たさない場合はperf:seed自体を失敗させ、負荷試験が「ページングされない1ページ目だけ」を
// 計測してしまう事態（無言で境界未達のまま実行される）を防ぐ
async function verifyPaginationTargetCounts(paginationTargetUserId: string) {
  const [commentsWritten, commentsReceived, followers, following] = await Promise.all([
    prisma.comment.count({ where: { authorId: paginationTargetUserId } }),
    prisma.comment.count({ where: { post: { authorId: paginationTargetUserId } } }),
    prisma.follow.count({ where: { followingId: paginationTargetUserId } }),
    prisma.follow.count({ where: { followerId: paginationTargetUserId } }),
  ]);

  console.log(
    `[seed] ページング検証対象ユーザーの件数: 投稿したコメント=${commentsWritten} / 受け取ったコメント=${commentsReceived} / フォロワー=${followers} / フォロー中=${following}`
  );

  const failures: string[] = [];
  if (commentsWritten < PAGINATION_MIN_COUNT) failures.push(`投稿したコメント(${commentsWritten}件)`);
  if (commentsReceived < PAGINATION_MIN_COUNT) failures.push(`受け取ったコメント(${commentsReceived}件)`);
  if (followers < PAGINATION_MIN_COUNT) failures.push(`フォロワー(${followers}人)`);
  if (following < PAGINATION_MIN_COUNT) failures.push(`フォロー中(${following}人)`);

  if (failures.length > 0) {
    throw new Error(
      `ページング検証対象ユーザーが${PAGINATION_MIN_COUNT}件未満の項目があります: ${failures.join("、")}`
    );
  }
}

async function main() {
  const startedAt = Date.now();

  await cleanDatabase();
  const users = await seedUsers();
  // 先頭ユーザー（heavyUsersの1人目、perf_001）をGATE-22種類Bの負荷試験対象に固定する。
  // writeOutputFiles/users.csvもemail昇順で書き出すため、常にusers[0]と一致する
  const paginationTargetUserId = users[0].id;
  const { postIds, targetPostIds } = await seedPosts(users, paginationTargetUserId);
  await seedLikes(users, postIds);
  await seedComments(users, postIds, paginationTargetUserId, targetPostIds);
  await seedFollows(users, paginationTargetUserId);
  await seedNotifications(users, postIds);
  await writeOutputFiles(
    await prisma.user.findMany({ select: { id: true, email: true, nickname: true }, orderBy: { email: "asc" } }),
    postIds,
    paginationTargetUserId
  );
  await verifyCounterIntegrity();
  await verifyPaginationTargetCounts(paginationTargetUserId);

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[seed] 完了（${elapsedSec}秒）`);
}

main()
  .catch((e) => {
    console.error("[seed] 失敗:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
