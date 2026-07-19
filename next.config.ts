import type { NextConfig } from "next";

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
};

export default nextConfig;
