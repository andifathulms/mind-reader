import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project from /mind-reader/. Override with BASE_PATH
// when hosting elsewhere.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/mind-reader/',
  plugins: [react()],
  build: {
    target: 'es2022',
    // Two entries. The arena stays at the root because DESIGN.md 4.5 makes the
    // first experience playing rather than reading; the landing page is a
    // second door for people arriving from a link, and it shares the tokens,
    // the fonts and the engine with the app rather than restating them.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        landing: fileURLToPath(new URL('./landing.html', import.meta.url)),
      },
    },
    // Fonts ship as files in the bundle, never fetched from a CDN: PRD 7.5
    // forbids any network request at runtime.
    assetsInlineLimit: 0,
  },
});
