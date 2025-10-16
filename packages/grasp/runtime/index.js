/*
 * Minimal runtime entry for @motor/grasp so plain Node.js consumers (like the CLI)
 * can use the core functionality without a build step.  This mirrors the logic
 * from the TypeScript sources in packages/grasp/src.
 */

// --- core graph primitives --------------------------------------------------
export function makeId(s) {
  return s;
}

export function node(id, label) {
  return { id, label };
}

export function edge(from, to, label) {
  return { from, to, label };
}

export function createGraph() {
  return { adj: new Map(), nodes: new Map() };
}

export function addNode(g, n) {
  if (!g.adj.has(n.id)) g.adj.set(n.id, new Set());
  if (g.nodes instanceof Map && !g.nodes.has(n.id)) {
    g.nodes.set(n.id, n);
  }
}

export function addEdge(g, e) {
  addNode(g, { id: e.from, label: '' });
  addNode(g, { id: e.to, label: '' });
  g.adj.get(e.from).add(e.to);
}

// --- helpers ----------------------------------------------------------------
function cmp(a, b) {
  return a.toString().localeCompare(b.toString());
}

function sortIds(xs) {
  return Array.from(xs).sort(cmp);
}

function ensureString(x) {
  return String(x);
}

function nodeLabel(g, id) {
  return g.nodes?.get(id)?.label ?? ensureString(id);
}

function esc(s) {
  return ensureString(s).replace(/"/g, '\\"');
}

// --- GraphJSON --------------------------------------------------------------
export function validateGraphJSON(j) {
  const errors = [];
  if (typeof j !== 'object' || j === null) {
    return { ok: false, errors: ['root must be an object'] };
  }

  const obj = j;
  const nodes = obj.nodes;
  const edges = obj.edges;

  if (!Array.isArray(nodes)) errors.push('nodes must be an array');
  if (!Array.isArray(edges)) errors.push('edges must be an array');

  const idSet = new Set();
  if (Array.isArray(nodes)) {
    nodes.forEach((n, i) => {
      if (typeof n !== 'object' || n === null) {
        errors.push(`nodes[${i}] must be object`);
        return;
      }
      const { id, label } = n;
      if (typeof id !== 'string' || id.trim() === '') {
        errors.push(`nodes[${i}].id must be non-empty string`);
      }
      if (typeof label !== 'string') {
        errors.push(`nodes[${i}].label must be string`);
      }
      if (typeof id === 'string') {
        if (idSet.has(id)) errors.push(`duplicate node id "${id}"`);
        idSet.add(id);
      }
    });
  }

  if (Array.isArray(edges)) {
    edges.forEach((e, i) => {
      if (typeof e !== 'object' || e === null) {
        errors.push(`edges[${i}] must be object`);
        return;
      }
      const { from, to, label } = e;
      if (typeof from !== 'string' || from.trim() === '') {
        errors.push(`edges[${i}].from must be non-empty string`);
      }
      if (typeof to !== 'string' || to.trim() === '') {
        errors.push(`edges[${i}].to must be non-empty string`);
      }
      if (label !== undefined && typeof label !== 'string') {
        errors.push(`edges[${i}].label must be string if present`);
      }
      if (typeof from === 'string' && !idSet.has(from)) {
        errors.push(`edges[${i}].from references missing node "${from}"`);
      }
      if (typeof to === 'string' && !idSet.has(to)) {
        errors.push(`edges[${i}].to references missing node "${to}"`);
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

export function toJSON(g) {
  const nodes = [];
  const edges = [];

  const nodeIds = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());

  for (const id of nodeIds) {
    const label = g.nodes?.get(id)?.label ?? ensureString(id);
    nodes.push({ id: ensureString(id), label });
  }

  for (const from of sortIds(g.adj.keys())) {
    const tos = g.adj.get(from);
    if (!tos) continue;
    for (const to of sortIds(tos)) {
      edges.push({ from: ensureString(from), to: ensureString(to) });
    }
  }

  return { nodes, edges };
}

export function fromJSON(j) {
  const validation = validateGraphJSON(j);
  if (!validation.ok) {
    throw new Error('Invalid GraphJSON:\n' + validation.errors.map(e => ' - ' + e).join('\n'));
  }
  const data = j;
  const g = createGraph();
  for (const n of data.nodes) {
    const id = makeId(n.id);
    addNode(g, node(id, n.label));
  }
  for (const e of data.edges) {
    const f = makeId(e.from);
    const t = makeId(e.to);
    addEdge(g, edge(f, t, e.label));
  }
  return g;
}

// --- presentation helpers ---------------------------------------------------
export function inspect(g) {
  const lines = [];
  const nodeIds = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
  const hasNodeLabels = Boolean(g.nodes && g.nodes.size);
  const nodesLine = nodeIds
    .map((id) => {
      const base = `"${ensureString(id)}"`;
      if (hasNodeLabels) return `${base} [${nodeLabel(g, id)}]`;
      const label = nodeLabel(g, id);
      return label !== ensureString(id) ? `${base} [${label}]` : base;
    })
    .join(', ');
  lines.push(`nodes: ${nodesLine || '(none)'}`);

  lines.push('edges:');
  let edgeCount = 0;
  for (const from of sortIds(g.adj.keys())) {
    const tos = g.adj.get(from);
    if (!tos || tos.size === 0) continue;
    for (const to of sortIds(tos)) {
      lines.push(`  "${ensureString(from)}" -> "${ensureString(to)}"`);
      edgeCount++;
    }
  }
  if (edgeCount === 0) lines.push('  (none)');

  return lines.join('\n');
}

export function toDOT(g, opts = {}) {
  const name = opts.graphName ?? 'G';
  const lines = [];
  lines.push(`digraph ${name} {`);

  const nodeIds = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
  for (const id of nodeIds) {
    const label = g.nodes?.get(id)?.label ?? ensureString(id);
    lines.push(`  "${esc(id)}" [label="${esc(label)}"];`);
  }

  for (const from of sortIds(g.adj.keys())) {
    const tos = g.adj.get(from);
    if (!tos) continue;
    for (const to of sortIds(tos)) {
      lines.push(`  "${esc(from)}" -> "${esc(to)}";`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

export function genChain(n) {
  if (!Number.isInteger(n) || n <= 0) throw new Error('n must be a positive integer');
  const g = createGraph();
  for (let i = 1; i <= n; i++) {
    const id = String(i);
    addNode(g, node(id, id));
  }
  for (let i = 1; i < n; i++) {
    addEdge(g, edge(String(i), String(i + 1)));
  }
  return g;
}

export function genCycle(n) {
  const g = genChain(n);
  if (n > 1) addEdge(g, edge(String(n), String(1)));
  return g;
}

export function genStar(n) {
  if (!Number.isInteger(n) || n <= 0) throw new Error('n must be a positive integer');
  const g = createGraph();
  for (let i = 1; i <= n; i++) {
    const id = String(i);
    addNode(g, node(id, id));
  }
  for (let i = 2; i <= n; i++) {
    addEdge(g, edge('1', String(i)));
  }
  return g;
}

// helpers to iterate keys deterministically
function edgeCount(g) {
  let m = 0;
  for (const from of g.adj.keys()) {
    const tos = g.adj.get(from);
    if (tos) m += tos.size;
  }
  return m;
}

export function computeDegrees(g) {
  const ids = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
  const out = new Map();
  const inn = new Map();
  for (const id of ids) { out.set(id, 0); inn.set(id, 0); }
  for (const from of g.adj.keys()) {
    const tos = g.adj.get(from);
    if (!tos) continue;
    out.set(from, (out.get(from) ?? 0) + tos.size);
    for (const to of tos) {
      inn.set(to, (inn.get(to) ?? 0) + 1);
      if (!out.has(to)) out.set(to, 0);
      if (!inn.has(from)) inn.set(from, 0);
    }
  }
  let minOut = Infinity, maxOut = 0, minIn = Infinity, maxIn = 0;
  for (const id of ids) {
    const o = out.get(id) ?? 0;
    const i = inn.get(id) ?? 0;
    if (o < minOut) minOut = o;
    if (o > maxOut) maxOut = o;
    if (i < minIn)  minIn  = i;
    if (i > maxIn)  maxIn  = i;
  }
  if (!ids.length) { minOut = maxOut = minIn = maxIn = 0; }
  return { out, inn, minOut, maxOut, minIn, maxIn };
}

export function hasCycle(g) {
  // Kahn's algorithm
  const ids = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
  const indeg = new Map();
  for (const id of ids) indeg.set(id, 0);
  for (const from of g.adj.keys()) {
    const tos = g.adj.get(from);
    if (!tos) continue;
    for (const to of tos) indeg.set(to, (indeg.get(to) ?? 0) + 1);
    if (!indeg.has(from)) indeg.set(from, 0);
  }
  const q = [];
  for (const [id, d] of indeg) if (d === 0) q.push(id);
  let removed = 0;
  while (q.length) {
    const v = q.shift();
    removed++;
    const tos = g.adj.get(v);
    if (!tos) continue;
    for (const to of tos) {
      const d = (indeg.get(to) ?? 0) - 1;
      indeg.set(to, d);
      if (d === 0) q.push(to);
    }
  }
  const total = indeg.size;
  return removed !== total && total > 0;
}

export function countSCCs(g) {
  // Kosaraju
  const ids = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
  const adj = g.adj;
  // build reverse graph adjacency
  const radj = new Map();
  for (const id of ids) { radj.set(id, new Set()); }
  for (const from of adj.keys()) {
    const tos = adj.get(from);
    if (!tos) continue;
    for (const to of tos) {
      if (!radj.has(to)) radj.set(to, new Set());
      radj.get(to).add(from);
      if (!radj.has(from)) radj.set(from, radj.get(from) ?? new Set());
    }
  }
  const vis = new Set();
  const order = [];
  function dfs1(v) {
    vis.add(v);
    const tos = adj.get(v);
    if (tos) for (const to of tos) if (!vis.has(to)) dfs1(to);
    order.push(v);
  }
  for (const v of ids) if (!vis.has(v)) dfs1(v);
  const vis2 = new Set();
  let comps = 0;
  function dfs2(v) {
    vis2.add(v);
    const froms = radj.get(v);
    if (froms) for (const u of froms) if (!vis2.has(u)) dfs2(u);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (!vis2.has(v)) { comps++; dfs2(v); }
  }
  return ids.length ? comps : 0; // пустой граф → 0 КСС
}

export function graphStats(g) {
  const nodes = (g.nodes && g.nodes.size) ? g.nodes.size : new Set([...g.adj.keys()]).size;
  const edges = edgeCount(g);
  const deg = computeDegrees(g);
  const cyc = hasCycle(g);
  const scc = countSCCs(g);
  return {
    nodes,
    edges,
    minOut: deg.minOut,
    maxOut: deg.maxOut,
    minIn: deg.minIn,
    maxIn: deg.maxIn,
    hasCycle: cyc,
    sccCount: scc,
  };
}
