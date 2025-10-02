// @ts-check
import { defineConfig } from "vitest/config";
import { normalizePath } from "vite";
import path from "node:path";

const r = (...p) => normalizePath(path.resolve(__dirname, ...p));
const workspaceRoot = r("..", "..");

const alias = [
  { find: "@motor/core", replacement: r("../core/src") },
  { find: "@motor/core/", replacement: r("../core/src/") },
  { find: "@motor/parser", replacement: r("../parser/src") },
  { find: "@motor/parser/", replacement: r("../parser/src/") },
  { find: "@motor/tsa", replacement: r("../tsa/src") },
  { find: "@motor/tsa/", replacement: r("../tsa/src/") },
];

/** @type {import('vitest/config').UserConfig} */
export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias,
  },
  server: {
    // Vitest runs on top of Vite's dev server; allow reading workspace root
    fs: { allow: [workspaceRoot] },
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Vitest v2: configure dependency inlining here
    deps: {
      inline: [/@motor\//],
      moduleDirectories: ["node_modules"],
    },
  },
});
