import type { NextConfig } from "next";
import { getBucketHostname } from "./src/lib/s3-url";

// App RouterはhydrationでNext.js自身がinline scriptを埋め込むため、リクエスト毎のnonceを
// 発行しない静的ヘッダーではscript-srcに'unsafe-inline'を許容せざるを得ずCSPの主目的（XSS対策）
// が形骸化する。nonceの動的発行（proxy.tsでの生成）は工数対効果が見合わないため見送り、
// まずはContent-Security-Policy-Report-Onlyで違反レポートを収集し、段階的にstrict化する方針とする。
const s3Hostname = getBucketHostname();

const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: https://images.unsplash.com${s3Hostname ? ` https://${s3Hostname}` : ""}`,
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(s3Hostname ? [{ protocol: "https" as const, hostname: s3Hostname }] : []),
    ],
    // 保険としての下限値（本来はS3側のCache-Controlに追従する: max(minimumCacheTTL, 上流のmax-age)）。
    // ユーザーアップロード画像はUUIDキーで内容が変わらないため長期キャッシュしてよい。
    // 本番シード画像（uploads/{userId}/seed/{postId}/{index}.jpg）は決定的キーのため、
    // 内容を差し替える場合はキー自体をバージョニングする運用とする（README.md参照）。
    minimumCacheTTL: 2678400, // 31日
  },
  // 開発サーバーはデフォルトでlocalhost以外のオリジン（実機からのLAN IPアクセス等）からの
  // アセット読み込みをブロックするため、モバイル実機での動作確認用に許可する
  // （本番ビルドでは無関係な開発時専用の設定）。個人のLAN IPをリポジトリに固定で残さないよう、
  // 未設定時は空配列にする（実機確認時のみ.env.localでDEV_ALLOWED_ORIGINを設定する）
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGIN ? [process.env.DEV_ALLOWED_ORIGIN] : [],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
            : []),
        ],
      },
      {
        // Twemojiの固定アイコン（50ファイル、1ページあたり最大20件超読み込まれる）。
        // 内容が変わらないため長期キャッシュする。差し替える場合はファイル名自体を変える運用とする。
        source: "/twemoji/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
