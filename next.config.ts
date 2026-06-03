import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // googleapis usa módulos Node.js (http, https, stream) — no deben tocarse con Webpack
  serverExternalPackages: ["googleapis", "google-auth-library"],

  // Google Apps Script deployments require this header to avoid CORS issues
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
