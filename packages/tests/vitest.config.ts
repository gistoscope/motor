import { defineConfig } from 'vitest/config'
import { vitestAliases } from '../../scripts/aliases.generated'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', '../../tests/sessions/**/*.test.ts'],
  },
  resolve: { alias: vitestAliases },
})
