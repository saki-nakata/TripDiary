import { describe, it, expect } from "vitest";
import { compare, hash } from "@node-rs/bcrypt";

// bcryptjsからの置き換え（6-A2）に伴う回帰テスト。
// このファイルは意図的に @node-rs/bcrypt を vi.mock しない
// （実物のハッシュ比較を検証するため）。

const PASSWORD = "CorrectHorseBatteryStaple";
// 現行bcryptjs（3.0.3, cost 10）が実際に生成した既存データを想定したfixture
const BCRYPTJS_2B_HASH = "$2b$10$g6jHlDdS2gI.ssuitN6x1.V2j0nqMkYGdY/HQnuWl2RZS978iZoXW";
// 上記と同じソルト・ダイジェストのまま、バージョンタグのみ$2a$に置き換えた
// 追加の互換性確認用fixture（$2a$/$2b$はアルゴリズムとしては同一で、タグの違いは
// 過去のバグ修正の有無を示すのみのため、実データの回帰確認は$2b$を優先する）
const BCRYPTJS_2A_HASH = "$2a$10$g6jHlDdS2gI.ssuitN6x1.V2j0nqMkYGdY/HQnuWl2RZS978iZoXW";

describe("password compat: @node-rs/bcrypt と既存bcryptjsハッシュの互換性", () => {
  it("既存bcryptjsが生成した$2b$ハッシュをcompare()で検証できる", async () => {
    await expect(compare(PASSWORD, BCRYPTJS_2B_HASH)).resolves.toBe(true);
  });

  it("誤ったパスワードでは$2b$ハッシュの検証が失敗する", async () => {
    await expect(compare("wrong-password", BCRYPTJS_2B_HASH)).resolves.toBe(false);
  });

  it("（補助的確認）$2a$形式のハッシュもcompare()で検証できる", async () => {
    await expect(compare(PASSWORD, BCRYPTJS_2A_HASH)).resolves.toBe(true);
  });
});

describe("password compat: 72バイト超パスワードの挙動（bcryptjsとの差異確認）", () => {
  it("72バイトを超える長いASCIIパスワードでもhash/compareが例外を投げない", async () => {
    const longAscii = "A".repeat(100);
    const hashed = await hash(longAscii, 10);
    await expect(compare(longAscii, hashed)).resolves.toBe(true);
  });

  it("72バイトを超えるASCIIパスワードは、bcryptjs同様72バイトまでで照合される（サイレント切り詰め）", async () => {
    const longAscii = "A".repeat(100);
    const hashed = await hash(longAscii, 10);
    const truncatedTo72 = longAscii.slice(0, 72);
    // bcryptjsと同じ「72バイト以降は無視される」挙動であれば、
    // 元のパスワードでも72バイトに切り詰めた版でも同じハッシュを検証できる
    await expect(compare(truncatedTo72, hashed)).resolves.toBe(true);
  });

  it("既存bcryptjsが生成した72バイト超ASCIIパスワードのハッシュをcompare()で検証できる", async () => {
    const longAscii = "A".repeat(100);
    const hashedByBcryptjs = "$2b$10$8U8pw12TacH8Sltir/ts4unoVaKEkG.ZuPOL4FQlI0CMyWmOIkzc6";
    await expect(compare(longAscii, hashedByBcryptjs)).resolves.toBe(true);
  });

  it("UTF-8で72バイトを超える長い日本語パスワードでもhash/compareが例外を投げない", async () => {
    const longJapanese = "あ".repeat(30); // 'あ'は UTF-8で3バイト × 30 = 90バイト
    const hashed = await hash(longJapanese, 10);
    await expect(compare(longJapanese, hashed)).resolves.toBe(true);
  });

  it("既存bcryptjsが生成した長い日本語パスワードのハッシュをcompare()で検証できる", async () => {
    const longJapanese = "あ".repeat(30);
    const hashedByBcryptjs = "$2b$10$IvykadLHLlT9uAN0TvNVH.GivCNErKS/se1Ywb8GBZDpnaG7D3.T2";
    await expect(compare(longJapanese, hashedByBcryptjs)).resolves.toBe(true);
  });
});
