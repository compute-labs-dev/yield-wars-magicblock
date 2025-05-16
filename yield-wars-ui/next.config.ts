import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // Don't fail build on TS errors during deployment
    ignoreBuildErrors: true,
  },
  eslint: {
    // Don't fail build on ESLint errors during deployment
    ignoreDuringBuilds: true,
  },
  env: {
    NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
    GOOGLE_SCRIPT_URL: process.env.GOOGLE_SCRIPT_URL,
    NEXT_PUBLIC_USE_LOCAL_VALIDATOR: process.env.NEXT_PUBLIC_USE_LOCAL_VALIDATOR,
  },
};

export default nextConfig;
