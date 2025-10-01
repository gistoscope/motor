import { defineConfig } from 'vitest/config'
import * as path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      // Map package name to local sources, so Vitest doesn't require a built dist.
      '@motor/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
})
