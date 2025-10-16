import { makeId, node, edge } from './api.js';
import { createGraph, addNode, addEdge } from './core.js';
// --- deterministic helpers (no external deps) ---
function cmp(a, b) {
    return a.toString().localeCompare(b.toString());
}
function sortIds(xs) {
    return Array.from(xs).sort(cmp);
}
// --- validation ---
export function validateGraphJSON(j) {
    const errors = [];
    if (typeof j !== 'object' || j === null)
        return { ok: false, errors: ['root must be an object'] };
    const obj = j;
    const nodes = obj.nodes;
    const edges = obj.edges;
    if (!Array.isArray(nodes))
        errors.push('nodes must be an array');
    if (!Array.isArray(edges))
        errors.push('edges must be an array');
    const idSet = new Set();
    if (Array.isArray(nodes)) {
        nodes.forEach((n, i) => {
            if (typeof n !== 'object' || n === null) {
                errors.push(`nodes[${i}] must be object`);
                return;
            }
            const { id, label } = n;
            if (typeof id !== 'string' || id.trim() === '')
                errors.push(`nodes[${i}].id must be non-empty string`);
            if (typeof label !== 'string')
                errors.push(`nodes[${i}].label must be string`);
            if (typeof id === 'string') {
                if (idSet.has(id))
                    errors.push(`duplicate node id "${id}"`);
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
            if (typeof from !== 'string' || from.trim() === '')
                errors.push(`edges[${i}].from must be non-empty string`);
            if (typeof to !== 'string' || to.trim() === '')
                errors.push(`edges[${i}].to must be non-empty string`);
            if (label !== undefined && typeof label !== 'string')
                errors.push(`edges[${i}].label must be string if present`);
            if (typeof from === 'string' && !idSet.has(from))
                errors.push(`edges[${i}].from references missing node "${from}"`);
            if (typeof to === 'string' && !idSet.has(to))
                errors.push(`edges[${i}].to references missing node "${to}"`);
        });
    }
    return { ok: errors.length === 0, errors };
}
export function assertValidGraphJSON(j) {
    const res = validateGraphJSON(j);
    if (!res.ok)
        throw new Error('Invalid GraphJSON:\n' + res.errors.map(e => ' - ' + e).join('\n'));
}
// --- I/O ---
export function toJSON(g) {
    const nodes = [];
    const edges = [];
    const nodeIds = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
    for (const id of nodeIds) {
        const label = g.nodes?.get(id)?.label ?? String(id);
        nodes.push({ id: String(id), label });
    }
    for (const from of sortIds(g.adj.keys())) {
        const tos = g.adj.get(from);
        if (!tos)
            continue;
        for (const to of sortIds(tos)) {
            edges.push({ from: String(from), to: String(to) });
        }
    }
    return { nodes, edges };
}
export function fromJSON(j) {
    assertValidGraphJSON(j);
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
