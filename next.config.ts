import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // One canonical North Macedonia page (spec section C): permanent 308 redirect.
  async redirects() {
    return [{ source: "/country/north-macedonia", destination: "/north-macedonia", permanent: true }];
  },
};

export default nextConfig;
