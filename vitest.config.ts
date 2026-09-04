import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts: the engine and the statistics are pure, so the
// suite needs no DOM, no JSX transform and no plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
