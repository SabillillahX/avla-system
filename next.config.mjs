/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ['lucide-react', '@mui/material', 'lodash'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'backend.sabill.me',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.simpleicons.org',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig