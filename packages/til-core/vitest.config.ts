import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: path.resolve(__dirname, "../.."),
  test: {
    environment: "node",
    include: ["packages/til-core/test/**/*.test.ts"],
    setupFiles: ["packages/til-core/test/setup.ts"],
  },
});
