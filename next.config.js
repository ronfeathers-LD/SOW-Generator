/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'tlxeqgk0yr1ztnva.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // Tree-shake barrel-file packages to reduce bundle size
    optimizePackageImports: [
      '@tiptap/react',
      '@tiptap/core',
      '@tiptap/starter-kit',
      '@tiptap/extension-text-align',
      '@tiptap/extension-underline',
    ],
  },
}

module.exports = nextConfig
