/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['puppeteer-core', 'puppeteer'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        // Legacy: images previously uploaded to Vercel Blob
        protocol: 'https',
        hostname: 'tlxeqgk0yr1ztnva.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        // Supabase Storage public objects (rte-images bucket)
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
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
