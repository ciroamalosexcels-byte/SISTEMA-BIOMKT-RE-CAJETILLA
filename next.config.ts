import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
