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
  graphStats,
  genChain,
  genCycle,
  genStar,
  genGrid,
  genTree,
  genBipartite
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
  --out FILE    Write output to file (adds trailing \\n)`,
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
    gen: `motor gen --kind chain|cycle|star|grid|tree|bipartite [FLAGS] [--format json|dot|inspect] [--name NAME] [--out FILE]

Description:
  Generate synthetic graphs with deterministic outputs.

Flags:
  --kind K      Must be one of: chain, cycle, star, grid, tree, bipartite
  --n N         Positive integer (chain|cycle|star)
  --rows R      Positive integer (grid)
  --cols C      Positive integer (grid)
  --arity K     Positive integer (tree)
  --depth D     Non-negative integer (tree)
  --left L      Non-negative integer (bipartite)
  --right R     Non-negative integer (bipartite)
  --format F    One of: json (default), dot, inspect
  --name NAME   Graph name for DOT (default: G)
  --out FILE    Write output to file (adds trailing \\n)`
  };
  const text = H[cmd];
  if (text) process.stdout.write(text + '\n');
  else process.stdout.write('Unknown command for help: ' + String(cmd) + '\n');
}

// <<HELP:BEGIN>>
function printTopHelp() {
  process.stdout.write(
`motor — GRASP CLI
Usage:
  motor --help | -h
  motor --version | -v
  motor help [<cmd>]
  motor version

  motor inspect [--in FILE] [--out FILE]
  motor dot [--in FILE] [--name NAME] [--out FILE]
  motor json [--in FILE] [--out FILE]
  motor validate [--in FILE]
  motor stats [--in FILE] [--format text|json]
  motor gen --kind chain|cycle|star|grid|tree|bipartite [FLAGS] [--format json|dot|inspect] [--name NAME] [--out FILE]

Commands:
  inspect    Print a human-readable dump
  dot        Emit Graphviz DOT
  json       Validate & normalize GraphJSON
  validate   Validate GraphJSON (OK/exit codes)
  gen        Generate synthetic graphs (chain|cycle|star|grid|tree|bipartite)
  stats      Compute graph metrics

Reads GraphJSON from FILE or STDIN (if --in not provided).

Common flags:
  --in FILE       Read GraphJSON from FILE (otherwise STDIN)
  --out FILE      Write output to FILE (stdout stays empty when used)
  --name NAME     Graph name for DOT (default: G)

Examples:
  # inspect from file
  motor inspect --in graph.json
  # dot with graph name
  cat graph.json | motor dot --name G
  # json normalize to file
  motor json --in graph.json --out normalized.json
  # validate from stdin
  cat graph.json | motor validate
  # generate chain and print stats (text + json)
  motor gen --kind chain --n 3 --format inspect
  motor gen --kind chain --n 3 --format json | motor stats --format json
  # handle paths with spaces
  motor dot --in "C:\\tmp\\my graph.json" --out "C:\\tmp\\my graph.dot"
`
  );
}
// <<HELP:END>>

function withNL(s) { return s.endsWith('\n') ? s : (s + '\n'); }

function printError(msg) {
  const text = String(msg);
  process.stderr.write(text.endsWith('\n') ? text : text + '\n');
}

function die(msg, code = 1) {
  printError(msg);
  process.exit(code);
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

    // First non-flag token is the command (even if unknown),
    // to ensure proper "Unknown command" path.
    if (!cmd && !a.startsWith('-')) { cmd = a; continue; }

    if (a === '--help' || a === '-h') { flags.set('help', true); continue; }
    if (a === '--version' || a === '-v') { flags.set('version', true); continue; }
    if (a === '--in') { flags.set('in', args[++i]); continue; }
    if (a === '--name' || a === '-n') { flags.set('name', args[++i]); continue; }
    if (a === '--out') { flags.set('out', args[++i]); continue; }
    if (a === '--format' || a === '-f') { flags.set('format', args[++i]); continue; }
    if (a === '--kind') { flags.set('kind', args[++i]); continue; }
    if (a === '-k') { flags.set('k', args[++i]); continue; }
    if (a === '--n') { flags.set('n', args[++i]); continue; }
    if (a === '--rows') { flags.set('rows', args[++i]); continue; }
    if (a === '--cols') { flags.set('cols', args[++i]); continue; }
    if (a === '--arity') { flags.set('arity', args[++i]); continue; }
    if (a === '--depth') { flags.set('depth', args[++i]); continue; }
    if (a === '--left') { flags.set('left', args[++i]); continue; }
    if (a === '--right') { flags.set('right', args[++i]); continue; }
    rest.push(a);
  }
  return { cmd, flags, rest };
}

function readGraphJSON(flags) {
  const inFile = flags.get('in');
  let text = '';

  try {
    if (inFile) {
      text = readFileSync(inFile, 'utf8');
    } else {
      // read from stdin (sync for inspect/dot/json/stats)
      try { text = readFileSync(0, 'utf8'); }
      catch { text = ''; }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    die('Failed to read input: ' + msg);
  }

  if (!inFile && text === '') {
    die('no input; provide --in FILE or pipe JSON');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    die('invalid JSON: ' + msg);
  }

  const validation = validateGraphJSON(parsed);
  if (!validation.ok) {
    printError('Invalid GraphJSON:');
    validation.errors.forEach(m => printError('- ' + m));
    process.exit(1);
  }

  return parsed;
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
  await writeOutput(JSON.stringify(normalized, null, 2), flags.get('out'));
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
      printError('no input; provide --in FILE or pipe JSON');
      process.exitCode = 1;
      return;
    }
  }
  let obj;
  try { obj = JSON.parse(text); }
  catch (e) {
    printError('invalid JSON: ' + (e && e.message ? e.message : String(e)));
    process.exitCode = 1; return;
  }
  const res = validateGraphJSON(obj);
  if (res.ok) { process.stdout.write('OK\n'); process.exitCode = 0; }
  else { for (const m of res.errors) printError('- ' + m); process.exitCode = 1; }
}

async function cmdStats(flags) {
  const j = readGraphJSON(flags);
  const g = fromJSON(j);
  const fmt = (flags.get('format') || 'text').toLowerCase();
  const s = graphStats(g);

  if (fmt === 'json') {
    await writeOutput(JSON.stringify({
      nodes: s.nodes,
      edges: s.edges,
      minOut: s.minOut,
      maxOut: s.maxOut,
      minIn: s.minIn,
      maxIn: s.maxIn,
      hasCycle: s.hasCycle,
      sccCount: s.sccCount
    }, null, 2), flags.get('out'));
  } else if (fmt === 'text') {
    const lines = [
      `nodes: ${s.nodes}`,
      `edges: ${s.edges}`,
      `outDegree: min=${s.minOut} max=${s.maxOut}`,
      `inDegree: min=${s.minIn} max=${s.maxIn}`,
      `hasCycle: ${s.hasCycle ? 'true' : 'false'}`,
      `sccCount: ${s.sccCount}`
    ];
    await writeOutput(lines.join('\n'), flags.get('out'));
  } else {
    die('invalid --format; expected text|json');
  }
}

async function cmdGen(flags) {
  const kind = String(flags.get('kind') || flags.get('k') || '').trim();
  const fmt = (flags.get('format') || 'json').toLowerCase();
  const name = flags.get('name') || 'G';
  const outPath = flags.get('out');

  const allowedKinds = ['chain','cycle','star','grid','tree','bipartite'];
  if (!kind || !allowedKinds.includes(kind)) {
    die('invalid --kind; expected chain|cycle|star|grid|tree|bipartite');
  }
  if (!['json','dot','inspect'].includes(fmt)) {
    die('invalid --format; expected json|dot|inspect');
  }

  let g;
  const ensurePositive = (val, flagName) => {
    const n = Number(val);
    if (!Number.isInteger(n) || n <= 0) {
      die(`invalid --${flagName}; must be a positive integer`);
    }
    return n;
  };
  const ensureNonNegative = (val, flagName) => {
    const n = Number(val);
    if (!Number.isInteger(n) || n < 0) {
      die(`invalid --${flagName}; must be a non-negative integer`);
    }
    return n;
  };

  if (kind === 'chain' || kind === 'cycle' || kind === 'star') {
    const nRaw = flags.get('n');
    if (nRaw === undefined) {
      die('chain|cycle|star kinds require --n');
    }
    const n = ensurePositive(nRaw, 'n');
    if (kind === 'chain') g = genChain(n);
    else if (kind === 'cycle') g = genCycle(n);
    else g = genStar(n);
  } else if (kind === 'grid') {
    const rowsRaw = flags.get('rows');
    const colsRaw = flags.get('cols');
    if (rowsRaw === undefined || colsRaw === undefined) {
      die('grid kind requires --rows and --cols');
    }
    const rows = ensurePositive(rowsRaw, 'rows');
    const cols = ensurePositive(colsRaw, 'cols');
    g = genGrid(rows, cols);
  } else if (kind === 'tree') {
    const arityRaw = flags.get('arity');
    const depthRaw = flags.get('depth');
    if (arityRaw === undefined || depthRaw === undefined) {
      die('tree kind requires --arity and --depth');
    }
    const arity = ensurePositive(arityRaw, 'arity');
    const depth = ensureNonNegative(depthRaw, 'depth');
    g = genTree(arity, depth);
  } else {
    const leftRaw = flags.get('left');
    const rightRaw = flags.get('right');
    if (leftRaw === undefined || rightRaw === undefined) {
      die('bipartite kind requires --left and --right');
    }
    const left = ensureNonNegative(leftRaw, 'left');
    const right = ensureNonNegative(rightRaw, 'right');
    g = genBipartite(left, right);
  }

  let text = '';
  if (fmt === 'json')      text = JSON.stringify(toJSON(g), null, 2);
  else if (fmt === 'dot')  text = toDOT(g, { graphName: name });
  else                     text = inspectGraph(g);

  await writeOutput(text, outPath);
  process.exitCode = 0;
}

// <<MAIN:BEGIN>>
async function main(argv) {
  const { cmd, flags, rest } = parseArgs(argv);

  // --help/--version short-circuit
  if (flags.get('help') && cmd) { printCmdHelp(cmd); process.exit(0); }
  if (flags.get('help') && !cmd) { printTopHelp();  process.exit(0); }
  if (flags.get('version')) {
    process.stdout.write((getPkg().version ?? '0.0.0') + '\n');
    process.exit(0);
  }

  if (cmd === 'version') {
    process.stdout.write((getPkg().version ?? '0.0.0') + '\n');
    process.exit(0);
  }

  // `help` subcommand mirrors --help
  if (cmd === 'help') {
    const target = rest[0];
    if (target) printCmdHelp(target);
    else printTopHelp();
    process.exit(0);
  }

  if (!cmd) { printTopHelp(); process.exit(0); }

  if (cmd === 'inspect')  return cmdInspect(flags);
  if (cmd === 'dot')      return cmdDot(flags);
  if (cmd === 'json')     return cmdJson(flags);
  if (cmd === 'validate') return cmdValidate(flags);
  if (cmd === 'stats')    return cmdStats(flags);
  if (cmd === 'gen')      return cmdGen(flags);

  die('Unknown command: ' + String(cmd));
}
// <<MAIN:END>>

await main(process.argv);
