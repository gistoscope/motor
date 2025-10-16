import {
  validateGraphJSON, fromJSON, toJSON,
  inspect as inspectGraph, toDOT,
  bfs, dfs, pathExists, shortestPath, makeId
} from '@motor/grasp';

type Vfs = Record<string, string>;
export interface RunOptions {
  /** in-memory files; if absent, only '-' (stdin) is allowed */
  vfs?: Vfs;
  /** stdin content used when path === '-' */
  stdin?: string;
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): { cmd: string | null; file: string | null; flags: Flags } {
  const args = [...argv];
  const flags: Flags = {};
  let cmd: string | null = null;
  let file: string | null = null;

  while (args.length) {
    const a = args.shift()!;
    if (!cmd) { cmd = a; continue; }
    if (!file && !a.startsWith('--')) { file = a; continue; }
    if (a.startsWith('--')) {
      const [k, v] = a.includes('=') ? a.split('=') : [a, args[0]?.startsWith('--') ? 'true' : args[0]];
      const key = k.replace(/^--/, '');
      if (v !== undefined && !v.startsWith('--')) { flags[key] = v; args.shift(); }
      else { flags[key] = true; }
      continue;
    }
  }
  return { cmd, file, flags };
}

function getText(pathOrDash: string | null | undefined, opts: RunOptions): { ok: true; text: string } | { ok: false; err: string } {
  if (!pathOrDash) return { ok: false, err: 'missing <file.json>' };
  if (pathOrDash === '-') return { ok: true, text: opts.stdin ?? '' };
  if (opts.vfs && Object.prototype.hasOwnProperty.call(opts.vfs, pathOrDash)) {
    return { ok: true, text: opts.vfs[pathOrDash]! };
  }
  return { ok: false, err: `file not found: ${pathOrDash}` };
}

function jsonOf(pathOrDash: string | null | undefined, opts: RunOptions): { ok: true; json: unknown } | { ok: false; err: string } {
  const t = getText(pathOrDash, opts);
  if (!t.ok) return t;
  try {
    return { ok: true, json: JSON.parse(t.text) };
  } catch (e: any) {
    return { ok: false, err: `invalid JSON: ${e?.message ?? String(e)}` };
  }
}

function asStr(x: unknown) { return String(x); }
function toIdArray(ids: unknown[]): string[] { return ids.map(asStr); }

export async function runCli(argv: string[], opts: RunOptions = {}): Promise<RunResult> {
  const { cmd, file, flags } = parseArgs(argv);
  if (!cmd) return { code: 2, stdout: '', stderr: 'usage: <cmd> <file.json|-> [options]\n' };

  const fail = (msg: string): RunResult => ({ code: 1, stdout: '', stderr: msg + '\n' });
  const ok = (out: string): RunResult => ({ code: 0, stdout: out.endsWith('\n') ? out : out + '\n', stderr: '' });

  switch (cmd) {
    case 'validate': {
      const r = jsonOf(file, opts);
      if (!r.ok) return fail(r.err);
      const v = validateGraphJSON(r.json);
      return v.ok ? ok('OK') : fail('Invalid GraphJSON:\n' + v.errors.map(e => ' - ' + e).join('\n'));
    }
    case 'inspect': {
      const r = jsonOf(file, opts);
      if (!r.ok) return fail(r.err);
      const g = fromJSON(r.json);
      return ok(inspectGraph(g));
    }
    case 'dot': {
      const r = jsonOf(file, opts);
      if (!r.ok) return fail(r.err);
      const name = (flags.name as string) || 'G';
      const g = fromJSON(r.json);
      return ok(toDOT(g, { graphName: name }));
    }
    case 'to-json': {
      const r = jsonOf(file, opts);
      if (!r.ok) return fail(r.err);
      const g = fromJSON(r.json);
      return ok(JSON.stringify(toJSON(g), null, 2));
    }
    case 'traverse': {
      const r = jsonOf(file, opts);
      if (!r.ok) return fail(r.err);
      const start = (flags.bfs as string) || (flags.dfs as string) || '';
      if (!start) return fail('missing --bfs START or --dfs START');
      const g = fromJSON(r.json);
      const id = makeId(start);
      const order = flags.bfs ? bfs(g as any, id) : dfs(g as any, id);
      return ok(JSON.stringify(toIdArray(order as any), null, 2));
    }
    case 'path-exists': {
      const r = jsonOf(file, opts);
      if (!r.ok) return fail(r.err);
      const from = flags.from as string; const to = flags.to as string;
      if (!from || !to) return fail('missing --from X and/or --to Y');
      const g = fromJSON(r.json);
      const res = pathExists(g as any, makeId(from), makeId(to));
      return ok(res ? 'true' : 'false');
    }
    case 'shortest-path': {
      const r = jsonOf(file, opts);
      if (!r.ok) return fail(r.err);
      const from = flags.from as string; const to = flags.to as string;
      if (!from || !to) return fail('missing --from X and/or --to Y');
      const g = fromJSON(r.json);
      const p = shortestPath(g as any, makeId(from), makeId(to));
      return ok(p ? JSON.stringify(toIdArray(p as any), null, 2) : 'null');
    }
    default:
      return { code: 2, stdout: '', stderr: `unknown command: ${cmd}\n` };
  }
}

export default { runCli };
