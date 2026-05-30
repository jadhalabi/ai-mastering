import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: '/',
  },
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static', '@ffprobe-installer/ffprobe'],
};

export default nextConfig;
