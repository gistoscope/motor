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
