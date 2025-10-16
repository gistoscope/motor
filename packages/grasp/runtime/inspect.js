function cmp(a, b) {
    return a.toString().localeCompare(b.toString());
}
function sortIds(xs) {
    return Array.from(xs).sort(cmp);
}
function s(x) { return String(x); }
function lbl(g, id) {
    return g.nodes?.get(id)?.label ?? s(id);
}
/** Deterministic, human-readable dump of the graph for logs/snapshots. */
export function inspect(g) {
    const lines = [];
    // Nodes
    const nodeIds = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
    const hasNodeLabels = Boolean(g.nodes && g.nodes.size);
    const nodesLine = nodeIds
        .map((id) => {
        const base = `"${s(id)}"`;
        if (hasNodeLabels)
            return `${base} [${lbl(g, id)}]`;
        const label = lbl(g, id);
        return label !== s(id) ? `${base} [${label}]` : base;
    })
        .join(', ');
    lines.push(`nodes: ${nodesLine || '(none)'}`);
    // Edges
    lines.push('edges:');
    let edgeCount = 0;
    for (const from of sortIds(g.adj.keys())) {
        const tos = g.adj.get(from);
        if (!tos || tos.size === 0)
            continue;
        for (const to of sortIds(tos)) {
            lines.push(`  "${s(from)}" -> "${s(to)}"`);
            edgeCount++;
        }
    }
    if (edgeCount === 0)
        lines.push('  (none)');
    return lines.join('\n');
}
