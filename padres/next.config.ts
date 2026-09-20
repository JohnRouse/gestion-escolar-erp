import type { NextConfig } from "next";

const apiInternalUrl = (
  process.env.API_INTERNAL_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '3000-w-tiansky1993-morghlxn.cluster-o6xgj6spb5bw6q2doeigm2qy6c.cloudworkstations.dev',
    '3003-w-tiansky1993-morghlxn.cluster-o6xgj6spb5bw6q2doeigm2qy6c.cloudworkstations.dev'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalUrl}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiInternalUrl}/uploads/:path*`,
      },
    ];
  },
  // Configuración PWA
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
};

export default nextConfig;
