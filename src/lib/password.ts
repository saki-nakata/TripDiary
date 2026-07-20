import { hash } from "bcryptjs";

const DEFAULT_BCRYPT_COST = 12;

// テスト/CI環境でのみ BCRYPT_COST を下げ、bcryptjs（純JS実装でメインスレッドを
// ブロックする）のCPU負荷を減らす。compare() 側はハッシュに埋め込まれたコストを
// そのまま使うため呼び出し不要（hash()側だけ変えれば整合する）。
// 本番環境変数には BCRYPT_COST を設定しないこと（コストを下げるとパスワードの
// 総当たり耐性が下がるため）。
function getBcryptCost(): number {
  const raw = process.env.BCRYPT_COST;
  if (!raw) return DEFAULT_BCRYPT_COST;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_BCRYPT_COST;
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, getBcryptCost());
}
