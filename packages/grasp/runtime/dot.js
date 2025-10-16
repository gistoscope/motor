function cmp(a, b) {
    return a.toString().localeCompare(b.toString());
}
function sortIds(xs) {
    return Array.from(xs).sort(cmp);
}
function esc(s) {
    return String(s).replace(/"/g, '\\"');
}
/** Export graph to Graphviz DOT (directed). Deterministic ordering. */
export function toDOT(g, opts) {
    const name = opts?.graphName ?? 'G';
    const lines = [];
    lines.push(`digraph ${name} {`);
    // Nodes: from declared nodes map, else from adjacency keys
    const nodeIds = g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
    for (const id of nodeIds) {
        const label = g.nodes?.get(id)?.label ?? String(id);
        lines.push(`  "${esc(id)}" [label="${esc(label)}"];`);
    }
    // Edges
    for (const from of sortIds(g.adj.keys())) {
        const tos = g.adj.get(from);
        if (!tos)
            continue;
        for (const to of sortIds(tos)) {
            lines.push(`  "${esc(from)}" -> "${esc(to)}";`);
        }
    }
    lines.push('}');
    return lines.join('\n');
}
