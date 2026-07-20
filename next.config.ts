import type { NextConfig } from "next";

// App RouterはhydrationでNext.js自身がinline scriptを埋め込むため、リクエスト毎のnonceを
// 発行しない静的ヘッダーではscript-srcに'unsafe-inline'を許容せざるを得ずCSPの主目的（XSS対策）
// が形骸化する。nonceの動的発行（proxy.tsでの生成）は工数対効果が見合わないため見送り、
// まずはContent-Security-Policy-Report-Onlyで違反レポートを収集し、段階的にstrict化する方針とする。
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com https://*.amazonaws.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
  // 開発サーバーはデフォルトでlocalhost以外のオリジン（実機からのLAN IPアクセス等）からの
  // アセット読み込みをブロックするため、モバイル実機での動作確認用に許可する
  // （本番ビルドでは無関係な開発時専用の設定）
  allowedDevOrigins: ["192.168.1.6"],
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
    ];
  },
};

export default nextConfig;
