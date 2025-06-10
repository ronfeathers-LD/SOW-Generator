/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'sow-generator-one.vercel.app'],
    },
  },
}

module.exports = nextConfig 