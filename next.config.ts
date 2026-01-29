import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Optimize image loading
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },
  
  // Experimental features for optimization
  experimental: {
    optimizePackageImports: ['@heroicons/react', '@headlessui/react'],
    // Enable server actions optimization
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Compression
  compress: true,
  
  // Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  
  // React strict mode for better debugging
  reactStrictMode: true,
  
  // Optimize output
  output: 'standalone',
};

export default nextConfig;
