import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configures pdf-parse as an external package, bypassing bundler compilation for Node.js internals
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
