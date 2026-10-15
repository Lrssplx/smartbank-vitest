import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', clearMocks: true, include: ['tests/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.ts'], exclude: ['src/main.ts'],
      reporter: ['text', 'html', 'json-summary'], thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 } }
  }
});
