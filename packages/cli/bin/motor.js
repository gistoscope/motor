#!/usr/bin/env node
/* eslint-disable no-console */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  // core I/O
  toJSON, fromJSON, validateGraphJSON,
  // presentation
  toDOT, inspect as inspectGraph,
  // graph builders
  createGraph, addNode, addEdge, makeId, node, edge
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

  motor inspect [--in FILE] [--out FILE]
  motor dot [--in FILE] [--name NAME] [--out FILE]
  motor json [--in FILE] [--out FILE]
  motor validate [--in FILE]
  motor gen --kind chain|cycle|star --n N [--format json|dot|inspect] [--name NAME] [--out FILE]

Reads GraphJSON from FILE or STDIN when --in is omitted. Writes to FILE if --out is provided, otherwise to STDOUT.`
  );
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Map();
  let cmd = null;
  const rest = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!cmd && !a.startsWith('-') &&
        (a === 'inspect' || a === 'dot' || a === 'json' || a === 'validate' || a === 'gen')) {
      cmd = a;
      continue;
    }
    if (a === '--help' || a === '-h') { flags.set('help', true); continue; }
    if (a === '--version' || a === '-v') { flags.set('version', true); continue; }
    if (a === '--in') { flags.set('in', args[++i]); continue; }
    if (a === '--out') { flags.set('out', args[++i]); continue; }
    if (a === '--name' || a === '-n') { flags.set('name', args[++i]); continue; }
    if (a === '--format' || a === '-f') { flags.set('format', args[++i]); continue; }
    if (a === '--kind') { flags.set('kind', args[++i]); continue; }
    if (a === '--n') { flags.set('n', args[++i]); continue; }
    rest.push(a);
  }
  return { cmd, flags, rest };
}

function readGraphJSON(flags) {
  let text;
  const inFile = flags.get('in');
  try {
    text = inFile ? readFileSync(inFile, 'utf8') : readFileSync(0, 'utf8'); // stdin
  } catch (err) {
    console.error('Failed to read input:', err && err.message ? err.message : String(err));
    process.exit(1);
  }
  let j;
  try {
    j = JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON:', err && err.message ? err.message : String(err));
    process.exit(1);
  }
  const v = validateGraphJSON(j);
  if (!v.ok) {
    console.error('Invalid GraphJSON:\n' + v.errors.map(e => ' - ' + e).join('\n'));
    process.exit(1);
  }
  return j;
}

function writeOut(text, flags) {
  const outFile = flags.get('out');
  if (outFile) {
    try { writeFileSync(outFile, text); }
    catch (err) {
      console.error('Failed to write output:', err && err.message ? err.message : String(err));
      process.exit(1);
    }
  } else {
    process.stdout.write(text);
  }
}

function cmdInspect(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  writeOut(inspectGraph(g) + '\n', flags);
}

function cmdDot(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const name = flags.get('name') || 'G';
  writeOut(toDOT(g, { graphName: name }) + '\n', flags);
}

function cmdJson(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const normalized = toJSON(g);
  writeOut(JSON.stringify(normalized, null, 2) + '\n', flags);
}

function cmdValidate(flags) {
  // read & validate; readGraphJSON() уже кинет ошибку и exit(1), если не ок
  readGraphJSON(flags);
  console.log('OK');
}

function genGraph(kind, n) {
  const g = createGraph();
  const ids = [];
  for (let i = 1; i <= n; i++) {
    const id = makeId(String(i));
    ids.push(id);
    addNode(g, node(id, String(id)));
  }
  if (kind === 'chain' || kind === 'cycle') {
    for (let i = 0; i < n - 1; i++) addEdge(g, edge(ids[i], ids[i + 1]));
    if (kind === 'cycle' && n > 1) addEdge(g, edge(ids[n - 1], ids[0]));
  } else if (kind === 'star') {
    if (n >= 2) for (let i = 1; i < n; i++) addEdge(g, edge(ids[0], ids[i]));
  } else {
    console.error('Unknown --kind:', kind);
    process.exit(1);
  }
  return g;
}

function cmdGen(flags) {
  const kind = flags.get('kind');
  const nRaw = flags.get('n');
  const format = (flags.get('format') || 'json').toLowerCase();
  const name = flags.get('name') || 'G';

  const n = Number(nRaw);
  if (!kind || !Number.isFinite(n) || n <= 0) {
    console.error('Usage: motor gen --kind chain|cycle|star --n N [--format json|dot|inspect] [--name NAME] [--out FILE]');
    process.exit(1);
  }

  const g = genGraph(kind, n);
  if (format === 'json') writeOut(JSON.stringify(toJSON(g), null, 2) + '\n', flags);
  else if (format === 'dot') writeOut(toDOT(g, { graphName: name }) + '\n', flags);
  else if (format === 'inspect') writeOut(inspectGraph(g) + '\n', flags);
  else {
    console.error('Unknown --format:', format);
    process.exit(1);
  }
}

function main(argv) {
  const { cmd, flags } = parseArgs(argv);

  if (flags.get('help')) { printTopHelp(); process.exit(0); }
  if (flags.get('version')) { console.log(getPkg().version ?? '0.0.0'); process.exit(0); }

  if (!cmd) { printTopHelp(); process.exit(0); }

  if (cmd === 'inspect') return cmdInspect(flags);
  if (cmd === 'dot') return cmdDot(flags);
  if (cmd === 'json') return cmdJson(flags);
  if (cmd === 'validate') return cmdValidate(flags);
  if (cmd === 'gen') return cmdGen(flags);

  console.error('Unknown command:', cmd);
  printTopHelp();
  process.exit(1);
}

main(process.argv);
