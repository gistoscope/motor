import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const resolveFromPackage = (...parts: string[]) =>
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), ...parts);

export default defineConfig({
  resolve: {
    alias: [
      { find: '@motor/core', replacement: resolveFromPackage('../core/src') },
      { find: '@motor/core/', replacement: resolveFromPackage('../core/src/') }
    ]
  },
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts']
  }
});
