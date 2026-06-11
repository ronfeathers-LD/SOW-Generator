import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // isomorphic-dompurify carries its own jsdom, so plain node is enough.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // src/lib/utils/__tests__/ predates any test runner in this repo and uses
    // jest APIs (jest.resetModules, jest.spyOn) without jest being installed —
    // those files have never been runnable. Excluded until ported to vitest.
    exclude: ['src/**/__tests__/**'],
  },
});
