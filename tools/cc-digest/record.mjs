#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const kv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  })
);

const now = new Date().toISOString();
const meta = {
  id:        kv.id ?? "CC-UNKNOWN",
  title:     kv.title ?? "",
  when:      kv.when ?? now,
  prompt:    kv.prompt ?? "",
  scope:     kv.scope ? String(kv.scope).split(",").map(s=>s.trim()).filter(Boolean) : [],
  tests:     kv.tests ? String(kv.tests).split(",").map(s=>s.trim()).filter(Boolean) : [],
  milestone: kv.milestone ?? "",
  risk:      kv.risk ?? "low",
  log:       (kv.log ?? "true") !== "false"
};

fs.writeFileSync(path.resolve(".ccmeta.json"), JSON.stringify(meta, null, 2));
console.log("Wrote .ccmeta.json:", meta);
