import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    projects: [
      { test: { name: 'db', include: ['tests/db/**/*.test.ts'], environment: 'node', testTimeout: 60000, hookTimeout: 180000 } },
      { test: { name: 'unit', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'], environment: 'jsdom' } },
    ],
  },
})
