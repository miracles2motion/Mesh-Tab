import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // Prevent ESLint flat-config warnings/errors from aborting the Vercel production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
