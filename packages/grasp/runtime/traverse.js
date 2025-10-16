/** Return outgoing neighbors for a node, tolerating different internal shapes. */
function outNeighbors(g, id) {
    // 1) adj: Map<GraspId, Set<GraspId>>
    const adj = g?.adj;
    if (adj instanceof Map) {
        const set = adj.get(id);
        return set ? Array.from(set) : [];
    }
    // 2) edges: Array<{ from: GraspId; to: GraspId }>
    const edges = g?.edges;
    if (Array.isArray(edges)) {
        return edges.filter((e) => e?.from === id).map((e) => e.to);
    }
    // 3) outNeighbors function on graph
    const fn = g?.outNeighbors;
    if (typeof fn === 'function') {
        return fn(id) ?? [];
    }
    return [];
}
export function bfs(g, start) {
    const seen = new Set();
    const order = [];
    if (start == null)
        return order;
    const q = [start];
    seen.add(start);
    while (q.length) {
        const v = q.shift();
        order.push(v);
        for (const w of outNeighbors(g, v)) {
            if (!seen.has(w)) {
                seen.add(w);
                q.push(w);
            }
        }
    }
    return order;
}
export function dfs(g, start) {
    const seen = new Set();
    const order = [];
    if (start == null)
        return order;
    (function visit(v) {
        seen.add(v);
        order.push(v);
        for (const w of outNeighbors(g, v)) {
            if (!seen.has(w))
                visit(w);
        }
    })(start);
    return order;
}
export function pathExists(g, from, to) {
    if (from === to)
        return true;
    const seen = new Set([from]);
    const q = [from];
    while (q.length) {
        const v = q.shift();
        for (const w of outNeighbors(g, v)) {
            if (w === to)
                return true;
            if (!seen.has(w)) {
                seen.add(w);
                q.push(w);
            }
        }
    }
    return false;
}
export function shortestPath(g, from, to) {
    if (from === to)
        return [from];
    const seen = new Set([from]);
    const prev = new Map();
    const q = [from];
    while (q.length) {
        const v = q.shift();
        for (const w of outNeighbors(g, v)) {
            if (seen.has(w))
                continue;
            seen.add(w);
            prev.set(w, v);
            if (w === to) {
                const path = [to];
                let cur = to;
                while (prev.has(cur)) {
                    const p = prev.get(cur);
                    path.push(p);
                    cur = p;
                }
                path.reverse();
                return path;
            }
            q.push(w);
        }
    }
    return null;
}
