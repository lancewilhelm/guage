import "dotenv/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  output: "standalone",
};

export default nextConfig;
