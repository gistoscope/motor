import { defineConfig, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve repo root from this file location (packages/web)
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = normalizePath(path.resolve(here, "..", ".."));

const motorSrc = (name: string) =>
  normalizePath(path.join(repoRoot, "packages", name, "src"));

// Build alias rules for both the package root and its deep subpaths
const motorAliases = [
  { find: /^@motor\/core(\/.*)?$/,   replacement: motorSrc("core") + "$1" },
  { find: /^@motor\/parser(\/.*)?$/, replacement: motorSrc("parser") + "$1" },
  { find: /^@motor\/tsa(\/.*)?$/,    replacement: motorSrc("tsa") + "$1" },
];

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: motorAliases,
  },
  // Make sure Vite can read files from the monorepo root on Windows
  server: {
    fs: { allow: [repoRoot] },
  },
  // Do not prebundle local workspace packages — always use source
  optimizeDeps: {
    exclude: ["@motor/core", "@motor/parser", "@motor/tsa"],
  },
  // And don't treat them as external in SSR/build pipelines
  ssr: {
    noExternal: [/^@motor\/.*/],
  },
  envPrefix: ["VITE_"],
});
