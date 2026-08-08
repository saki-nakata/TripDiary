// 02-post-create.demo.spec.ts専用。このspecは常にアップロード画像が必要なため、
// トップレベルでのrequiredEnvによる早期失敗のままにする（05はこのファイルをimportしない）。

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[demo] ${name}が設定されていません。`);
  return value;
}

export const UPLOAD_IMAGE_PATH = requiredEnv("DEMO_UPLOAD_IMAGE_PATH");
export const UPLOAD_IMAGE_PATH_2 = requiredEnv("DEMO_UPLOAD_IMAGE_PATH_2");
