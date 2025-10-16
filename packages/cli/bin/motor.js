#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  toJSON,
  fromJSON,
  validateGraphJSON,
  toDOT,
  inspect as inspectGraph,
  graphStats,
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

function printCmdHelp(cmd) {
  const H = {
    inspect: `motor inspect [--in FILE] [--out FILE]

Description:
  Print a human-readable dump (stable order).

Flags:
  --in FILE     Read GraphJSON from file (else STDIN)
  --out FILE    Write output to file (adds trailing \\n)`,
    dot: `motor dot [--in FILE] [--name NAME] [--out FILE]

Description:
  Emit Graphviz DOT (deterministic).

Flags:
  --in FILE     Read GraphJSON from file (else STDIN)
  --name NAME   Graph name for DOT (default: G)
  --out FILE    Write output to file (adds trailing \\n)` ,
    json: `motor json [--in FILE] [--out FILE]

Description:
  Validate + normalize GraphJSON deterministically.

Flags:
  --in FILE     Read GraphJSON from file (else STDIN)
  --out FILE    Write output to file (adds trailing \\n)`,
    validate: `motor validate [--in FILE]

Description:
  Validate GraphJSON and set exit codes:
   - OK + exit 0 for valid
   - errors to stderr + exit 1 for invalid

Flags:
  --in FILE     Read GraphJSON from file (else STDIN)`,
    stats: `motor stats [--in FILE] [--format text|json] [--out FILE]

Description:
  Compute graph metrics (nodes, edges, degrees, cycle, SCC count).

Flags:
  --in FILE     Read GraphJSON from file (else STDIN)
  --format F    text (default) or json
  --out FILE    Write output to file (adds trailing \\n)`,
    gen: `motor gen --kind chain|cycle|star --n N [--format json|dot|inspect] [--name NAME] [--out FILE]

Description:
  Generate synthetic graphs with deterministic outputs.

Flags:
  --kind K      Must be one of: chain, cycle, star
  --n N         Positive integer
  --format F    One of: json (default), dot, inspect
  --name NAME   Graph name for DOT (default: G)
  --out FILE    Write output to file (adds trailing \\n)`
  };
  const text = H[cmd];
  if (text) {
    process.stdout.write(text + '\n');
  } else {
    process.stdout.write('Unknown command for help: ' + String(cmd) + '\n');
  }
}

// <<HELP:BEGIN>>
function printTopHelp() {
  process.stdout.write(
`motor — GRASP CLI
Usage:
  motor --help | -h
  motor --version | -v

  motor inspect [--in FILE] [--out FILE]
  motor dot [--in FILE] [--name NAME] [--out FILE]
  motor json [--in FILE] [--out FILE]
  motor validate [--in FILE]
  motor stats [--in FILE] [--format text|json]
  motor gen --kind chain|cycle|star --n N [--format json|dot|inspect] [--name NAME] [--out FILE]

Commands:
  inspect    Print a human-readable dump
  dot        Emit Graphviz DOT
  json       Validate & normalize GraphJSON
  validate   Validate GraphJSON (OK/exit codes)
  gen        Generate synthetic graphs (chain|cycle|star)
  stats      Compute graph metrics

Reads GraphJSON from FILE or STDIN (if --in not provided).

Common flags:
  --in FILE       Read GraphJSON from FILE (otherwise STDIN)
  --out FILE      Write output to FILE (stdout stays empty when used)
  --name NAME     Graph name for DOT (default: G)

Examples:
  motor inspect --in graph.json
  cat graph.json | motor dot --name T
  motor json --in graph.json > normalized.json
  cat graph.json | motor validate
  motor validate --in graph.json
  motor gen --kind chain --n 3 --format inspect
  motor stats --in graph.json --format json
`
  );
}
// <<HELP:END>>

function withNL(s) { return s.endsWith('\n') ? s : (s + '\n'); }

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
    if (!cmd && !a.startsWith('-')) {
      cmd = a;
      continue;
    }
    if (a === '--help' || a === '-h') { flags.set('help', true); continue; }
    if (a === '--version' || a === '-v') { flags.set('version', true); continue; }
    if (a === '--in') { flags.set('in', args[++i]); continue; }
    if (a === '--name' || a === '-n') { flags.set('name', args[++i]); continue; }
    if (a === '--out') { flags.set('out', args[++i]); continue; }
    if (a === '--format' || a === '-f') { flags.set('format', args[++i]); continue; }
    if (a === '--kind') { flags.set('kind', args[++i]); continue; }
    if (a === '-k') { flags.set('k', args[++i]); continue; }
    if (a === '--n') { flags.set('n', args[++i]); continue; }
    rest.push(a);
  }
  return { cmd, flags, rest };
}

function readGraphJSON(flags) {
  let text;
  const inFile = flags.get('in');
  try {
    if (inFile) {
      text = readFileSync(inFile, 'utf8');
    } else {
      text = readFileSync(0, 'utf8');
    }
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    process.stderr.write(`failed to read input: ${message}\n`);
    process.exit(1);
  }

  let j;
  try {
    j = JSON.parse(text);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    process.stderr.write(`invalid JSON: ${message}\n`);
    process.exit(1);
  }

  const v = validateGraphJSON(j);
  if (!v.ok) {
    const msg = 'Invalid GraphJSON:\n' + v.errors.map(e => ' - ' + e).join('\n');
    process.stderr.write(msg + '\n');
    process.exit(1);
  }
  return j;
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
  const src = flags.get('in');
  let text = '';
  if (src) {
    const fs = await import('node:fs/promises');
    text = await fs.readFile(src, 'utf-8');
  } else {
    // read entire stdin (async; robust when no input is piped)
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
  try { obj = JSON.parse(text); }
  catch (e) {
    process.stderr.write('invalid JSON: ' + (e && e.message ? e.message : String(e)) + '\n');
    process.exitCode = 1; return;
  }
  const res = validateGraphJSON(obj);
  if (res.ok) { process.stdout.write('OK\n'); process.exitCode = 0; }
  else { for (const m of res.errors) process.stderr.write('- ' + m + '\n'); process.exitCode = 1; }
}

async function cmdStats(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const fmt = String(flags.get('format') ?? 'text').toLowerCase();
  const s = graphStats(g);
  if (fmt === 'json') {
    const out = {
      nodes: s.nodes,
      edges: s.edges,
      minOut: s.minOut,
      maxOut: s.maxOut,
      minIn: s.minIn,
      maxIn: s.maxIn,
      hasCycle: s.hasCycle,
      sccCount: s.sccCount
    };
    await writeOutput(JSON.stringify(out, null, 2), flags.get('out'));
    process.exitCode = 0;
  } else if (fmt === 'text') {
    const lines = [
      `nodes: ${s.nodes}`,
      `edges: ${s.edges}`,
      `outDegree: min=${s.minOut} max=${s.maxOut}`,
      `inDegree:  min=${s.minIn} max=${s.maxIn}`,
      `hasCycle: ${s.hasCycle ? 'true' : 'false'}`,
      `sccCount: ${s.sccCount}`
    ];
    await writeOutput(lines.join('\n'), flags.get('out'));
    process.exitCode = 0;
  } else {
    process.stderr.write('invalid --format; expected text|json\n');
    process.exit(1);
  }
}

async function cmdGen(flags) {
  const kind = String(flags.get('kind') || flags.get('k') || '').trim();
  const nRaw = flags.get('n');
  const fmt = String(flags.get('format') ?? 'json').toLowerCase();
  const name = flags.get('name') || 'G';
  const outPath = flags.get('out');

  if (!['chain', 'cycle', 'star'].includes(kind)) {
    process.stderr.write('invalid --kind; expected chain|cycle|star\n');
    process.exitCode = 1;
    return;
  }
  const n = Number(nRaw);
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
  if (fmt === 'json')      text = JSON.stringify(toJSON(g), null, 2) + '\n';
  else if (fmt === 'dot')  text = toDOT(g, { graphName: name }) + '\n';
  else                     text = inspectGraph(g) + '\n';

  if (outPath) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(outPath, text, 'utf-8');
  } else {
    process.stdout.write(text);
  }
  process.exitCode = 0;
}

// <<MAIN:BEGIN>>
async function main(argv) {
  const { cmd, flags } = parseArgs(argv);

  // Help/version → stdout + exit 0 (no console.log)
  if (flags.get('help') && cmd) { printCmdHelp(cmd); process.exit(0); }
  if (flags.get('help') && !cmd) { printTopHelp();  process.exit(0); }
  if (flags.get('version')) {
    process.stdout.write((getPkg().version ?? '0.0.0') + '\n');
    process.exit(0);
  }

  if (!cmd) { printTopHelp(); process.exit(0); }

  if (cmd === 'inspect')  return cmdInspect(flags);
  if (cmd === 'dot')      return cmdDot(flags);
  if (cmd === 'json')     return cmdJson(flags);
  if (cmd === 'validate') return cmdValidate(flags);
  if (cmd === 'stats')    return cmdStats(flags);
  if (cmd === 'gen')      return cmdGen(flags);

  process.stderr.write('Unknown command: ' + String(cmd) + '\n');
  process.exit(1);
}
// <<MAIN:END>>

await main(process.argv);
