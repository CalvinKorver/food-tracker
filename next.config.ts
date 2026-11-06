import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Mobile testing via ngrok (subdomain changes per session).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok-free.dev"],
  turbopack: {
    // Silence multi-lockfile root inference when a parent package-lock exists.
    root: path.join(__dirname),
  },
};

export default nextConfig;
