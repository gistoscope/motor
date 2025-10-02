// @ts-check
import react from "@vitejs/plugin-react";
import { defineConfig, normalizePath } from "vite";
import path from "node:path";

const r = (...p) => normalizePath(path.resolve(__dirname, ...p));
const workspaceRoot = r("..", "..");

// Explicit alias entries per local package (both base and trailing slash)
const alias = [
  { find: "@motor/core", replacement: r("../core/src") },
  { find: "@motor/core/", replacement: r("../core/src/") },
  { find: "@motor/parser", replacement: r("../parser/src") },
  { find: "@motor/parser/", replacement: r("../parser/src/") },
  { find: "@motor/tsa", replacement: r("../tsa/src") },
  { find: "@motor/tsa/", replacement: r("../tsa/src/") },
];

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [react()],
  root: __dirname,
  resolve: {
    preserveSymlinks: true,
    alias,
  },
  server: {
    fs: { allow: [workspaceRoot] },
  },
  optimizeDeps: {
    // Do not prebundle local workspace packages
    exclude: ["@motor/core", "@motor/parser", "@motor/tsa"],
  },
  ssr: {
    // Ensure local workspace packages are bundled, not treated as external
    noExternal: ["@motor/core", "@motor/parser", "@motor/tsa"],
  },
});
