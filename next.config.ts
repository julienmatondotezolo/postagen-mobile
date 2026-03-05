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
  runtimeCaching: [
    // Never cache cross-origin API calls (backend on VPS)
    {
      urlPattern: /^https?:\/\/(?!fonts\.googleapis\.com|fonts\.gstatic\.com)(?!.*\.vercel\.app).+/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "cross-origin-no-cache",
      },
    },
    // Google Fonts — keep cached
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    // Same-origin API routes — always network first, no stale fallback
    {
      urlPattern: /\/api\/.*/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "api-no-cache",
      },
    },
  ],
});

// Export with webpack config for next-pwa compatibility
export default pwaConfig(nextConfig);
