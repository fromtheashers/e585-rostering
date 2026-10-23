import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pg is a Node-only driver; keep it out of the bundler.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
