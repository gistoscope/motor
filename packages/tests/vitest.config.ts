import { defineConfig } from 'vitest/config'
import { vitestAliases } from '../../scripts/aliases.generated'

export default defineConfig({
  test: { environment: 'node' },
  resolve: { alias: vitestAliases }
})
