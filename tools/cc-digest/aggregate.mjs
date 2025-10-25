#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const pr = ev.pull_request || {};
if (!pr.merged) { console.log("PR not merged — skip"); process.exit(0); }

const body = pr.body || "";
const ymlMatch = body.match(/---\s*([\s\S]*?)\s*---/);
const yml = {};
if ( ymlMatch ) {
  for (const line of ymlMatch[1].split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.+?)\s*$/);
    if (m) {
      let v = m[2].trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1,-1);
      if (v === "true" || v === "false") v = v === "true";
      yml[m[1]] = v;
    }
  }
}

let meta = {};
if (fs.existsSync(".ccmeta.json")) {
  try { meta = JSON.parse(fs.readFileSync(".ccmeta.json","utf8")); } catch {}
}

const pick = (k, def) => (meta[k] ?? yml[k] ?? def);

const rec = {
  id:        pick("id", `PR${pr.number}`),
  title:     pick("title", pr.title || ""),
  when:      pick("when", pr.merged_at || new Date().toISOString()),
  prompt:    pick("prompt", ""),
  scope:     pick("scope", []),
  tests:     pick("tests", []),
  milestone: pick("milestone", ""),
  risk:      pick("risk", "low"),
  log:       (pick("log", true) !== false),
  pr: { number: pr.number, url: pr.html_url, sha: pr.merge_commit_sha, author: pr.user?.login || "" }
};

if (!rec.log) { console.log("log=false — skip"); process.exit(0); }

// docs/cc/cc-index.json
const idxPath = "docs/cc/cc-index.json";
let idx = [];
if (fs.existsSync(idxPath)) idx = JSON.parse(fs.readFileSync(idxPath,"utf8"));
idx.push(rec);
idx.sort((a,b)=> String(a.when).localeCompare(String(b.when)));
fs.mkdirSync(path.dirname(idxPath), { recursive:true });
fs.writeFileSync(idxPath, JSON.stringify(idx,null,2));

// docs/DevLog.md
const devPath = "docs/DevLog.md";
let dev = fs.existsSync(devPath) ? fs.readFileSync(devPath,"utf8") : "# DevLog\n\n";
dev += `### ${rec.id} — ${rec.when} — ${rec.title}\n`;
dev += `- PR: #${rec.pr.number} (${rec.pr.sha.slice(0,7)}) by @${rec.pr.author}\n`;
dev += `- Scope: ${Array.isArray(rec.scope)&&rec.scope.length?rec.scope.join(", "):"n/a"}\n`;
dev += `- Tests: ${Array.isArray(rec.tests)&&rec.tests.length?rec.tests.join(", "):"n/a"}\n`;
dev += `- Milestone: ${rec.milestone||"n/a"} · Risk: ${rec.risk}\n`;
if (rec.prompt) dev += `- Prompt: ${rec.prompt}\n`;
dev += `\n`;
fs.writeFileSync(devPath, dev);

// docs/Milestones.md (optional)
if (rec.milestone) {
  const msPath = "docs/Milestones.md";
  let ms = fs.existsSync(msPath) ? fs.readFileSync(msPath,"utf8") : "# Milestones\n\n";
  ms += `- ${rec.when} — ${rec.milestone}: ${rec.id} — ${rec.title}\n`;
  fs.writeFileSync(msPath, ms);
}

console.log("Digest updated:", rec.id);
