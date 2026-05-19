import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '3000-w-tiansky1993-morghlxn.cluster-o6xgj6spb5bw6q2doeigm2qy6c.cloudworkstations.dev',
    '3003-w-tiansky1993-morghlxn.cluster-o6xgj6spb5bw6q2doeigm2qy6c.cloudworkstations.dev'
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://10.88.0.3:3000/:path*',
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
