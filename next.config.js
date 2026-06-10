/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build output dir. Defaults to `.next` (used by `next dev` and the Railway
  // production build). `npm run build:verify` sets NEXT_DIST_DIR=.next-verify so
  // a verification build never clobbers the running dev server's `.next`
  // (which otherwise throws "Cannot find module './vendor-chunks/…'").
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
