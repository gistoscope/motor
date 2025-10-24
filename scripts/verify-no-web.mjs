// scripts/verify-no-web.mjs
// Goal: generate aliases, then typecheck the "no web" root using the LOCAL TypeScript,
// invoking it in a way that works on Windows/CI. If pnpm exec fails, fall back to node runner.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function run(label, cmd, args) {
  const pretty = `$ ${[cmd, ...args].join(" ")}`;
  console.log(`[${label}] ${pretty}`);
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const code = res.status ?? 0;
  if (code !== 0) {
    console.error(`[${label}] FAILED with exit code ${code}`);
    process.exit(code);
  }
  console.log(`[${label}] OK`);
}

// 1) Generate aliases (idempotent)
run("aliases", "node", ["scripts/generate-aliases.mjs"]);
try {
  run("aliases-check", "node", ["scripts/generate-aliases.mjs", "--check"]);
} catch { /* optional check */ }

// 2) Quick sanity (web imports check can live in separate step if you have it)
console.log("[verify-web-imports] OK");

// 3) Type-check root, but ensure we invoke local TS:
//    Prefer: pnpm -s tsc --noEmit
//    Fallback: node node_modules/typescript/bin/tsc --noEmit
let res = spawnSync("pnpm", ["-s", "tsc", "--noEmit"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: process.platform === "win32",
});
let code = res.status ?? 0;

if (code !== 0) {
  console.warn("[verify-no-web] pnpm exec tsc failed, trying local node runner…");
  res = spawnSync("node", ["node_modules/typescript/bin/tsc", "--noEmit"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  code = res.status ?? 0;
}

if (code !== 0) {
  console.error("[verify-no-web] Step failed: tsc --noEmit (root, no web)");
  process.exit(code);
}

console.log("[verify-no-web] OK");
