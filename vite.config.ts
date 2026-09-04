import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project from /mind-reader/. Override with BASE_PATH
// when hosting elsewhere.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/mind-reader/',
  plugins: [react()],
  build: {
    target: 'es2022',
    // Fonts ship as files in the bundle, never fetched from a CDN: PRD 7.5
    // forbids any network request at runtime.
    assetsInlineLimit: 0,
  },
});
