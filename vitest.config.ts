import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // tsconfig.json sets compilerOptions.jsx = "preserve" (Next.js's own SWC/Babel
  // transform expects that). Vite (this version bundles via Rolldown/oxc) reads
  // that same tsconfig and, left alone, also leaves JSX untransformed — which
  // breaks parsing any .test.tsx file. Force the oxc transform to compile JSX
  // for tests without touching the app-wide tsconfig setting.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    // isomorphic-dompurify carries its own jsdom, so plain node is enough.
    environment: 'node',
    // Placeholder Supabase env so modules that create a client at import time
    // (e.g. pm-hours-removal-service) can be imported under test. Tests inject
    // their own mock clients; these values are never used for real requests.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    include: ['src/**/*.test.{ts,tsx}'],
    // src/lib/utils/__tests__/ predates any test runner in this repo and uses
    // jest APIs (jest.resetModules, jest.spyOn) without jest being installed —
    // those files have never been runnable. Excluded until ported to vitest.
    exclude: ['src/**/__tests__/**'],
  },
});
