// AUTO-GENERATED. DO NOT EDIT.
import path from 'node:path';

export const aliasRootDir = path.resolve(__dirname, '..');

export const viteAliases = [
  { find: "@motor/core", replacement: path.resolve(aliasRootDir, "packages/core/src") },
  { find: "@motor/parser", replacement: path.resolve(aliasRootDir, "packages/parser/src") },
  { find: "@motor/tsa", replacement: path.resolve(aliasRootDir, "packages/tsa/src") }
] as const;

export const vitestAliases: Record<string, string> =
  Object.fromEntries(viteAliases.map(e => [e.find, e.replacement]));
