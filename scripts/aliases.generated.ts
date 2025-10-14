// AUTO-GENERATED. DO NOT EDIT.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const aliasRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const viteAliases = [
  { find: "@motor/core", replacement: path.resolve(aliasRootDir, "packages/core/src") },
  { find: "@motor/grasp", replacement: path.resolve(aliasRootDir, "packages/grasp/src") },
  { find: "@motor/parser", replacement: path.resolve(aliasRootDir, "packages/parser/src") },
  { find: "@motor/tsa", replacement: path.resolve(aliasRootDir, "packages/tsa/src") }
] as const;

export const vitestAliases: Record<string, string> =
  Object.fromEntries(viteAliases.map(e => [e.find, e.replacement]));
