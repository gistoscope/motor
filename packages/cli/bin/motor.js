#!/usr/bin/env node
/* eslint-disable no-console */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  toJSON,
  fromJSON,
  validateGraphJSON,
  toDOT,
  inspect as inspectGraph
} from '@motor/grasp';

function getPkg() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const pkgPath = join(__dirname, '..', 'package.json');
  const text = readFileSync(pkgPath, 'utf8');
  return JSON.parse(text);
}

function printTopHelp() {
  console.log(
`motor — GRASP CLI
Usage:
  motor --help | -h
  motor --version | -v

  motor inspect [--in FILE]
  motor dot [--in FILE] [--name NAME]
  motor json [--in FILE]

Reads GraphJSON from FILE or STDIN (if --in not provided).

Examples:
  motor inspect --in graph.json
  cat graph.json | motor dot --name T
  motor json --in graph.json > normalized.json`
  );
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Map();
  let cmd = null;
  const rest = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!cmd && !a.startsWith('-') && (a === 'inspect' || a === 'dot' || a === 'json')) {
      cmd = a;
      continue;
    }
    if (a === '--help' || a === '-h') { flags.set('help', true); continue; }
    if (a === '--version' || a === '-v') { flags.set('version', true); continue; }
    if (a === '--in') { flags.set('in', args[++i]); continue; }
    if (a === '--name' || a === '-n') { flags.set('name', args[++i]); continue; }
    rest.push(a);
  }
  return { cmd, flags, rest };
}

function readGraphJSON(flags) {
  try {
    let text;
    const inFile = flags.get('in');
    if (inFile) {
      text = readFileSync(inFile, 'utf8');
    } else {
      // read from stdin
      text = readFileSync(0, 'utf8');
    }
    const j = JSON.parse(text);
    const v = validateGraphJSON(j);
    if (!v.ok) {
      console.error('Invalid GraphJSON:\n' + v.errors.map(e => ' - ' + e).join('\n'));
      process.exit(1);
    }
    return j;
  } catch (err) {
    console.error('Failed to read/parse GraphJSON:', err && err.message ? err.message : String(err));
    process.exit(1);
  }
}

function cmdInspect(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  console.log(inspectGraph(g));
}

function cmdDot(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const name = flags.get('name') || 'G';
  console.log(toDOT(g, { graphName: name }));
}

function cmdJson(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const normalized = toJSON(g);
  // stable output + trailing newline
  process.stdout.write(JSON.stringify(normalized, null, 2) + '\n');
}

function main(argv) {
  const { cmd, flags } = parseArgs(argv);

  if (flags.get('help')) { printTopHelp(); process.exit(0); }
  if (flags.get('version')) { console.log(getPkg().version ?? '0.0.0'); process.exit(0); }

  if (!cmd) {
    // default to top-level help
    printTopHelp();
    process.exit(0);
  }

  if (cmd === 'inspect') return cmdInspect(flags);
  if (cmd === 'dot') return cmdDot(flags);
  if (cmd === 'json') return cmdJson(flags);

  console.error('Unknown command:', cmd);
  printTopHelp();
  process.exit(1);
}

main(process.argv);
