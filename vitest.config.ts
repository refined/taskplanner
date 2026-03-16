import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/core/**/*.test.ts'],
    globals: true,
  },
});
