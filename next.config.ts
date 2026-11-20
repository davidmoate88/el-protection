import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // STATIC_EXPORT=1 next build writes a plain static site to out/ — the app is
  // entirely client-side. That is how it is self-hosted (docs/DEPLOY_HOME_SERVER.md).
  ...(process.env.STATIC_EXPORT ? { output: "export" as const } : {}),
};

export default nextConfig;
