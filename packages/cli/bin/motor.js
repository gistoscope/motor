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
  inspect as inspectGraph,
  genChain,
  genCycle,
  genStar
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

Reads GraphJSON from FILE or STDIN (if --in not provided).

Examples:
  motor inspect --in graph.json --out dump.txt
  cat graph.json | motor dot --name T
  motor json --in graph.json --out normalized.json
  cat graph.json | motor validate
  motor validate --in graph.json
  motor gen --kind chain --n 3 --format inspect
  motor gen --kind cycle --n 4 --format dot --name MyG > g.dot
  motor gen --kind star  --n 5 --format json --out out.json`
  );
}

function withNL(s) {
  return s.endsWith('\n') ? s : (s + '\n');
}

async function writeOutput(text, outPath) {
  const data = withNL(text);
  if (outPath) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(outPath, data, 'utf-8');
  } else {
    process.stdout.write(data);
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Map();
  let cmd = null;
  const rest = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!cmd && !a.startsWith('-') && (a === 'inspect' || a === 'dot' || a === 'json' || a === 'validate' || a === 'gen')) {
      cmd = a;
      continue;
    }
    if (a === '--help' || a === '-h') { flags.set('help', true); continue; }
    if (a === '--version' || a === '-v') { flags.set('version', true); continue; }
    if (a === '--in') { flags.set('in', args[++i]); continue; }
    if (a === '--name' || a === '-n') { flags.set('name', args[++i]); continue; }
    if (a === '--kind') { flags.set('kind', args[++i]); continue; }
    if (a === '--n') { flags.set('n', args[++i]); continue; }
    if (a === '--format') { flags.set('format', args[++i]); continue; }
    if (a === '--out') { flags.set('out', args[++i]); continue; }
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

async function cmdInspect(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  await writeOutput(inspectGraph(g), flags.get('out'));
}

async function cmdDot(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const name = flags.get('name') || 'G';
  await writeOutput(toDOT(g, { graphName: name }), flags.get('out'));
}

async function cmdJson(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const normalized = toJSON(g);
  const text = JSON.stringify(normalized, null, 2);
  await writeOutput(text, flags.get('out'));
}

async function cmdValidate(flags) {
  const src = typeof flags.get === 'function' ? flags.get('in') : flags.in;
  let text = '';
  if (src) {
    const fs = await import('node:fs/promises');
    text = await fs.readFile(src, 'utf-8');
  } else {
    text = await new Promise((resolve) => {
      let buf = '';
      process.stdin.setEncoding('utf-8');
      process.stdin.on('data', (c) => { buf += c; });
      process.stdin.on('end', () => resolve(buf));
      process.stdin.resume();
    });
    if (!text) {
      process.stderr.write('no input; provide --in FILE or pipe JSON\n');
      process.exitCode = 1;
      return;
    }
  }

  let obj;
  try {
    obj = JSON.parse(text);
  } catch (e) {
    const message = e && e.message ? e.message : String(e);
    process.stderr.write('invalid JSON: ' + message + '\n');
    process.exitCode = 1;
    return;
  }

  const res = validateGraphJSON(obj);
  if (res.ok) {
    process.stdout.write('OK\n');
    process.exitCode = 0;
    return;
  }

  for (const m of res.errors) {
    process.stderr.write('- ' + m + '\n');
  }
  process.exitCode = 1;
}

async function cmdGen(flags) {
  const kind = String(flags.get('kind') ?? '');
  const nRaw = flags.get('n');
  const fmt = String(flags.get('format') ?? 'json').toLowerCase();
  const name = flags.get('name') ? String(flags.get('name')) : 'G';
  const outPath = flags.get('out') ? String(flags.get('out')) : '';

  const n = Number(nRaw);
  if (!['chain', 'cycle', 'star'].includes(kind)) {
    process.stderr.write('invalid --kind; expected chain|cycle|star\n');
    process.exitCode = 1;
    return;
  }
  if (!Number.isInteger(n) || n <= 0) {
    process.stderr.write('invalid --n; expected positive integer\n');
    process.exitCode = 1;
    return;
  }
  if (!['json', 'dot', 'inspect'].includes(fmt)) {
    process.stderr.write('invalid --format; expected json|dot|inspect\n');
    process.exitCode = 1;
    return;
  }

  let g;
  if (kind === 'chain') g = genChain(n);
  else if (kind === 'cycle') g = genCycle(n);
  else g = genStar(n);

  let text = '';
  if (fmt === 'json') {
    text = JSON.stringify(toJSON(g), null, 2) + '\n';
  } else if (fmt === 'dot') {
    text = toDOT(g, { graphName: name }) + '\n';
  } else {
    text = inspectGraph(g) + '\n';
  }

  if (outPath) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(outPath, text, 'utf-8');
  } else {
    process.stdout.write(text);
  }
  process.exitCode = 0;
}

async function main(argv) {
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
  if (cmd === 'validate') return cmdValidate(flags);
  if (cmd === 'gen') return cmdGen(flags);

  console.error('Unknown command:', cmd);
  printTopHelp();
  process.exit(1);
}

await main(process.argv);
