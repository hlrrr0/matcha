import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画像最適化設定 - Next.js 16では remotePatterns を使用
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // TypeScript設定
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // トレイル設定
  trailingSlash: false,
  
  // 出力設定 - Static Site Generationを無効化
  output: 'standalone',
  
  // Turbopack設定（Next.js 16のデフォルト）
  turbopack: {},
  
  // リダイレクト設定
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
