import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { normalizePath } from "vite";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = normalizePath(path.resolve(here, "..", ".."));

const motorSrc = (name: string) =>
  normalizePath(path.join(repoRoot, "packages", name, "src"));

const motorAliases = [
  { find: /^@motor\/core(\/.*)?$/,   replacement: motorSrc("core") + "$1" },
  { find: /^@motor\/parser(\/.*)?$/, replacement: motorSrc("parser") + "$1" },
  { find: /^@motor\/tsa(\/.*)?$/,    replacement: motorSrc("tsa") + "$1" },
];

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias: motorAliases,
  },
  // Mirror Vite's behavior for local workspace packages
  optimizeDeps: {
    exclude: ["@motor/core", "@motor/parser", "@motor/tsa"],
  },
  ssr: {
    noExternal: [/^@motor\/.*/],
  },
  // New Vitest v2 location for dependency inlining
  server: {
    deps: {
      inline: [/^@motor\/.*/],
    },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    coverage: {
      enabled: false,
    },
  },
});
