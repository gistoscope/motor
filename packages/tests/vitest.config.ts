import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node'
  },
  resolve: {
    alias: {
      '@motor/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@motor/parser': path.resolve(__dirname, '../parser/src/index.ts'),
      '@motor/tsa': path.resolve(__dirname, '../tsa/src/index.ts')
    }
  }
});
