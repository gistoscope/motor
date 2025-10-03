// @ts-check
import { defineConfig } from "vitest/config";
import { normalizePath } from "vite";
import path from "node:path";
import { createRequire } from "node:module";

const r = (...p) => normalizePath(path.resolve(__dirname, ...p));
const workspaceRoot = r("..", "..");

const require = createRequire(import.meta.url);
let environment: "happy-dom" | "node" = "happy-dom";
try {
  require.resolve("happy-dom");
} catch {
  environment = "node";
}

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
  root: __dirname,
  resolve: {
    preserveSymlinks: true,
    alias,
  },
  server: {
    // Vitest runs on top of Vite's dev server; allow reading workspace root
    fs: { allow: [workspaceRoot] },
  },
  test: {
    environment,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Vitest v2: configure dependency inlining here
    deps: {
      inline: [/@motor\//],
      moduleDirectories: ["node_modules"],
    },
  },
});
