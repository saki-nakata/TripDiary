// prisma/seed-production.ts は本番RDSへ書き込みを行うため、意図しない接続先での実行を防ぐガード。
// performance/assert-perf-database.ts と同じ「DB接続を伴わない純粋関数」の方針を踏襲する。
//
// バイパス用フラグ（例: SKIP_PRODUCTION_HOST_CHECK）は設けない。ホスト名を見て自動的に
// ローカルモード／本番モードへ分岐し、どちらにも一致しない場合は中断する。これにより
// 「チェックを無効化するフラグ」自体が存在せず、シェル履歴に残ったフラグが本番接続時に
// 誤って有効なまま、というリスクを構造的に排除する。

export type SeedMode = "local" | "production";

// infra/terraform/rds.tf の identifier = "${var.project_name}-prod"（project_nameの既定値は
// infra/terraform/variables.tf より "tripdiary"）。
//
// 部分一致（host.includes("tripdiary-prod")）は誤接続防止として弱い。攻撃を想定しなくとも、
// 例えば "tripdiary-prod-restore-test.example.com" のような検証用ホストを本番と誤認する。
// RDSのエンドポイントは必ず <identifier>.<資源ID>.<リージョン>.rds.amazonaws.com という
// 構造を取るため、「末尾が .rds.amazonaws.com」かつ「先頭ラベルが identifier と完全一致」の
// 2条件で厳密に判定する。
const PRODUCTION_DB_IDENTIFIER = "tripdiary-prod";
const RDS_HOST_SUFFIX = ".rds.amazonaws.com";

export function resolveSeedMode(databaseUrl: string | undefined): SeedMode {
  if (!databaseUrl) {
    throw new Error("[seed-production] DATABASE_URLが設定されていません。");
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(`[seed-production] DATABASE_URLの形式が不正です: ${databaseUrl}`);
  }

  const host = url.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "local";
  }

  const isRdsEndpoint = host.endsWith(RDS_HOST_SUFFIX);
  const identifierLabel = host.split(".")[0];
  if (!isRdsEndpoint || identifierLabel !== PRODUCTION_DB_IDENTIFIER) {
    throw new Error(
      `[seed-production] 接続先ホスト（${host}）が本番RDS（${PRODUCTION_DB_IDENTIFIER}${RDS_HOST_SUFFIX} 形式のエンドポイント）ともローカル（localhost/127.0.0.1）とも一致しません。意図しない接続先の可能性があるため中断します。`
    );
  }

  return "production";
}

export function assertProductionSeedConfirmed(env: Record<string, string | undefined> = process.env): void {
  // ローカルモードでも要求する。書き込み操作である以上、無条件実行を許さない
  if (env.CONFIRM_PRODUCTION_SEED !== "true") {
    throw new Error(
      "[seed-production] CONFIRM_PRODUCTION_SEED=trueが設定されていません。書き込みを伴うため、意図した実行であることを明示的に確認してください。"
    );
  }
}
