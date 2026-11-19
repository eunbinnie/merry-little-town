import type { NextConfig } from "next";

// GitHub Pages serves the site from /<repo>; the deploy workflow passes that
// path in. Locally (dev, or a plain `pnpm build`) it stays at the root.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // a fully static site in out/: no server needed
  output: "export",
  basePath,
  // the same path for code that builds asset URLs by hand (Phaser, canvas, share link)
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // no image optimisation server in a static export
  images: { unoptimized: true },
  // dev only: let a Cloudflare quick tunnel (random *.trycloudflare.com host) reach HMR/dev assets
  allowedDevOrigins: ["*.trycloudflare.com"],
  // (cacheComponents / partialPrefetching need a server; a static export can't use them)
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
