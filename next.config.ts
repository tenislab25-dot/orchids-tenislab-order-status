import type { NextConfig } from "next";

// Configuração corrigida - sem experimental.staleTimes inválido
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
