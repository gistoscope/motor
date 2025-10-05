// AUTO-GENERATED. DO NOT EDIT.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const aliasRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const viteAliases = [
  { find: "@motor/adapters", replacement: path.resolve(aliasRootDir, "src/adapters") },
  { find: "@motor/analyze", replacement: path.resolve(aliasRootDir, "src/analyze") },
  { find: "@motor/core", replacement: path.resolve(aliasRootDir, "src/core") },
  { find: "@motor/engine", replacement: path.resolve(aliasRootDir, "src/engine") },
  { find: "@motor/public", replacement: path.resolve(aliasRootDir, "src/public.ts") },
  { find: "@motor/rules", replacement: path.resolve(aliasRootDir, "src/rules") },
  { find: "@motor/types", replacement: path.resolve(aliasRootDir, "src/types") },
  { find: "@motor/ui-rich", replacement: path.resolve(aliasRootDir, "ui-rich/src") }
] as const;

export const vitestAliases = Object.fromEntries(viteAliases.map(e => [e.find, e.replacement])) as const;
