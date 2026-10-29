import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't ship source maps to the browser, so the original code can't be rebuilt from DevTools.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
