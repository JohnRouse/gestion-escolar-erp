import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Desactivar HMR para evitar errores de WebSocket en Cloud Workstations
    hmr: false,
  },
};

export default nextConfig;
