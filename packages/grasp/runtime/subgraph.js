function cloneEmpty(g) {
    return { adj: new Map(), nodes: g.nodes ? new Map() : undefined };
}
export function inducedSubgraph(g, ids) {
    const keep = new Set(ids);
    const out = cloneEmpty(g);
    // nodes
    if (g.nodes && out.nodes) {
        for (const id of keep) {
            const n = g.nodes.get(id);
            if (n)
                out.nodes.set(id, { id: n.id, label: n.label });
        }
    }
    // edges (only between kept nodes)
    for (const [u, nbrs] of g.adj) {
        if (!keep.has(u))
            continue;
        for (const v of nbrs) {
            if (!keep.has(v))
                continue;
            if (!out.adj.has(u))
                out.adj.set(u, new Set());
            out.adj.get(u).add(v);
        }
    }
    return out;
}
export function filterNodes(g, pred) {
    const ids = [];
    for (const id of g.adj.keys())
        if (pred(id))
            ids.push(id);
    return inducedSubgraph(g, ids);
}
export function filterEdges(g, pred) {
    const out = { adj: new Map(), nodes: g.nodes ? new Map() : undefined };
    if (g.nodes && out.nodes) {
        for (const [id, n] of g.nodes)
            out.nodes.set(id, { id: n.id, label: n.label });
    }
    for (const [u, nbrs] of g.adj) {
        for (const v of nbrs) {
            if (!pred(u, v))
                continue;
            if (!out.adj.has(u))
                out.adj.set(u, new Set());
            out.adj.get(u).add(v);
        }
    }
    return out;
}
