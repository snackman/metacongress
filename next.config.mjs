/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.coingecko.com",
      },
    ],
  },
  webpack: (config) => {
    // Polyfills needed by snarkjs (used by @semaphore-protocol/core)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      stream: false,
      crypto: false,
      os: false,
      path: false,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
