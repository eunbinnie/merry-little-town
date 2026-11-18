import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dev only: let a Cloudflare quick tunnel (random *.trycloudflare.com host) reach HMR/dev assets
  allowedDevOrigins: ["*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
