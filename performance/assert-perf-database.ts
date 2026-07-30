// performance/seed.ts はDBの全テーブルをTRUNCATEするため、.env.perf以外の環境変数
// (誤って本番・テスト・開発DBを指すDATABASE_URL)で実行されることを未然に防ぐガード。
// DB接続を伴わない純粋関数として、否定パターンを無接続の単体テストで検証できるようにする。

export const PERF_DATABASE_ALLOWLIST = {
  host: "127.0.0.1",
  port: "3308",
  database: "tripdiary_perf",
} as const;

export function assertPerfDatabase(databaseUrl: string | undefined): void {
  if (!databaseUrl) {
    throw new Error(
      "[seed] DATABASE_URLが設定されていません。performance/seed.tsはmysql-perf専用のため、.env.perf経由（pnpm perf:seed）で実行してください。"
    );
  }

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error(`[seed] DATABASE_URLの形式が不正です: ${databaseUrl}`);
  }

  const host = url.hostname;
  // MySQL接続URLでポート省略時はデフォルトの3306になるが、mysql-perfは3308でのみ公開しているため
  // 省略された場合も許可リストの3308とは一致せず、意図せず別DBへ繋がる誤設定として弾かれる。
  const port = url.port || "3306";
  const database = url.pathname.replace(/^\//, "");

  if (host !== PERF_DATABASE_ALLOWLIST.host || port !== PERF_DATABASE_ALLOWLIST.port) {
    throw new Error(
      `[seed] 接続先ホスト・ポートがperf専用DB（${PERF_DATABASE_ALLOWLIST.host}:${PERF_DATABASE_ALLOWLIST.port}）と一致しません（検出値: ${host}:${port}）。.env.perf以外の環境変数で実行しようとしていないか確認してください。`
    );
  }

  if (database !== PERF_DATABASE_ALLOWLIST.database) {
    throw new Error(
      `[seed] 接続先データベース名がperf専用DB（${PERF_DATABASE_ALLOWLIST.database}）と一致しません（検出値: ${database}）。.env.perf以外の環境変数で実行しようとしていないか確認してください。`
    );
  }
}

export function assertPerfTruncateConfirmed(env: Record<string, string | undefined> = process.env): void {
  if (env.CONFIRM_PERF_TRUNCATE !== "true") {
    throw new Error(
      "[seed] CONFIRM_PERF_TRUNCATE=trueが設定されていません。performance/seed.tsは全テーブルをTRUNCATEするため、意図した実行であることを明示的に確認してください。"
    );
  }
}
