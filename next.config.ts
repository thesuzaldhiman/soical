import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingIncludes: {
    '/api/**/*': [
      './bin/**/*',
      './public/bin/**/*',
      './node_modules/ffmpeg-static/**/*',
    ],
  },
  experimental: {
    cpus: 2,
  },
};

export default nextConfig;
