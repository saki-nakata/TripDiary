// 6-Cデモ動画撮影の本番誤実行防止ガード。prisma/seed-production.tsの
// resolveSeedMode/assertProductionSeedConfirmedと同じ考え方（ホスト名の完全一致判定・
// バイパス用フラグを設けない）を踏襲する。書き込みを行うspec（00〜04）だけが呼ぶ。

export type DemoTarget = "local" | "production";

const LOCAL_BASE_URL = "http://localhost:3000";
const PRODUCTION_BASE_URL = "http://54.248.13.248";

export function resolveDemoTarget(baseUrl: string): DemoTarget {
  if (baseUrl === LOCAL_BASE_URL) return "local";
  if (baseUrl === PRODUCTION_BASE_URL) return "production";
  throw new Error(
    `[demo] DEMO_BASE_URL(${baseUrl})がローカル(${LOCAL_BASE_URL})にも本番(${PRODUCTION_BASE_URL})にも一致しません。意図しない接続先の可能性があるため中断します。`
  );
}

export function assertProductionDemoConfirmed(env: Record<string, string | undefined> = process.env): void {
  if (env.CONFIRM_PRODUCTION_DEMO !== "true") {
    throw new Error("[demo] 本番への書き込みを伴うため、CONFIRM_PRODUCTION_DEMO=trueの明示設定が必要です。");
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[demo] ${name}が設定されていません。`);
  return value;
}

// 本番実行時は対象IDのフォールバックを禁止する（設定漏れで既定投稿・既定ユーザーへ
// 誤って書き込むことを防ぐため）。ローカルリハーサルのみ既定値へフォールバックしてよい。
export function resolveTargetPostId(target: DemoTarget): string {
  if (target === "production") return requiredEnv("DEMO_TARGET_POST_ID");
  return process.env.DEMO_TARGET_POST_ID ?? "seed-post-g-008";
}

export function resolveFollowTargetNickname(target: DemoTarget): string {
  if (target === "production") return requiredEnv("DEMO_FOLLOW_TARGET_NICKNAME");
  return process.env.DEMO_FOLLOW_TARGET_NICKNAME ?? "旅人05";
}

// 書き込みを行うspecの冒頭で呼ぶ。targetの判定・本番確認フラグの検証・撮影対象の
// 標準出力への表示までをまとめて行う。
export function assertDemoWriteAllowed(): { target: DemoTarget; targetPostId: string; followTargetNickname: string } {
  const baseUrl = requiredEnv("DEMO_BASE_URL");
  const target = resolveDemoTarget(baseUrl);
  if (target === "production") assertProductionDemoConfirmed();

  const targetPostId = resolveTargetPostId(target);
  const followTargetNickname = resolveFollowTargetNickname(target);
  console.log(
    `[demo] target=${target} baseUrl=${baseUrl} targetPostId=${targetPostId} followTargetNickname=${followTargetNickname}`
  );
  return { target, targetPostId, followTargetNickname };
}
