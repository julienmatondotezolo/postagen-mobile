import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* Silence the Turbopack vs Webpack conflict by declaring an empty turbopack config */
  turbopack: {},
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

// Export with webpack config for next-pwa compatibility
export default pwaConfig(nextConfig);
