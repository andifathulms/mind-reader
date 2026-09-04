import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project from /mind-reader/. Override with BASE_PATH
// when hosting elsewhere.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/mind-reader/',
  plugins: [react()],
  build: {
    target: 'es2022',
    // Fonts are inlined as files, never fetched from a CDN: PRD 7.5 forbids
    // any network request at runtime.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
