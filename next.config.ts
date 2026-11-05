import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Silence multi-lockfile root inference when a parent package-lock exists.
    root: path.join(__dirname),
  },
};

export default nextConfig;
