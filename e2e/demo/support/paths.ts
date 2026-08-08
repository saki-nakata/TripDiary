import path from "node:path";

// env非依存の単一情報源。playwright.config.ts と constants.ts の両方がここからimportする
// （2箇所で別々に組み立てると、片方だけ変更した際に「保存はされたが読み込まれず未ログインで
// 撮影」という気づきにくい失敗につながるため）。
export const DEMO_STORAGE_STATE_PATH = path.join(__dirname, "../.auth/demo-user.json");
