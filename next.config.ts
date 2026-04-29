import type { NextConfig } from "next";

import "./env";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./.secrets/**/*", "./assets/**/*", "./cert/**/*"],
  },
};

export default nextConfig;
