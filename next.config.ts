import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages are prepared ahead of time. Anything that reads the login cookie
  // sits inside <Suspense> so it can load for that person on each request.
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
