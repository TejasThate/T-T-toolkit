import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/auth/:path*",
        destination: `${backendUrl}/auth/:path*`,
      },
      {
        source: "/ai/:path*",
        destination: `${backendUrl}/ai/:path*`,
      },
      {
        source: "/news/:path*",
        destination: `${backendUrl}/news/:path*`,
      },
      {
        source: "/ping",
        destination: `${backendUrl}/ping`,
      },
    ];
  },
};

export default nextConfig;
