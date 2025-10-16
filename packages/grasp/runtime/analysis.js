/** Унифицированный доступ к исходящим соседям: adj Map, edges[], либо g.outNeighbors(id). */
function outNeighbors(g, id) {
    const adj = g?.adj;
    if (adj instanceof Map) {
        const set = adj.get(id);
        return set ? Array.from(set) : [];
    }
    const edges = g?.edges;
    if (Array.isArray(edges)) {
        return edges.filter((e) => e?.from === id).map((e) => e.to);
    }
    const fn = g?.outNeighbors;
    if (typeof fn === 'function') {
        return fn(id) ?? [];
    }
    return [];
}
/** Унифицированный доступ к входящим соседям. */
function inNeighbors(g, id) {
    const adj = g?.adj;
    if (adj instanceof Map) {
        const ins = [];
        for (const [u, set] of adj) {
            if (set?.has(id))
                ins.push(u);
        }
        return ins;
    }
    const edges = g?.edges;
    if (Array.isArray(edges)) {
        return edges.filter((e) => e?.to === id).map((e) => e.from);
    }
    // нет явной структуры → восстанавливать нельзя
    return [];
}
/** Обнаружение цикла в ориентированном графе (DFS color-marking). */
export function hasCycleDirected(g) {
    const GRAY = 1, BLACK = 2;
    const color = new Map();
    // соберём все вершины, которые встречаются в рёбрах/adj
    const vertices = new Set();
    // из adj
    const adj = g?.adj;
    if (adj instanceof Map) {
        for (const [u, set] of adj) {
            vertices.add(u);
            for (const v of set)
                vertices.add(v);
        }
    }
    // из edges
    const edges = g?.edges;
    if (Array.isArray(edges)) {
        for (const e of edges) {
            if (e?.from)
                vertices.add(e.from);
            if (e?.to)
                vertices.add(e.to);
        }
    }
    const stack = [];
    function dfs(u) {
        color.set(u, GRAY);
        stack.push(u);
        for (const v of outNeighbors(g, u)) {
            const c = color.get(v) ?? 0;
            if (c === GRAY)
                return true; // обратное ребро → цикл
            if (c === 0 && dfs(v))
                return true;
        }
        stack.pop();
        color.set(u, BLACK);
        return false;
    }
    for (const u of vertices) {
        if ((color.get(u) ?? 0) === 0) {
            if (dfs(u))
                return true;
        }
    }
    return false;
}
/** Топологическая сортировка (Kahn). Возвращает null при наличии цикла. */
export function topoSort(g) {
    const indeg = new Map();
    const verts = new Set();
    // собрать вершины и посчитать входящие степени
    const adj = g?.adj;
    if (adj instanceof Map) {
        for (const [u, set] of adj) {
            verts.add(u);
            for (const v of set) {
                verts.add(v);
                indeg.set(v, (indeg.get(v) ?? 0) + 1);
                indeg.set(u, indeg.get(u) ?? 0);
            }
        }
    }
    const edges = g?.edges;
    if (Array.isArray(edges)) {
        for (const e of edges) {
            const u = e?.from, v = e?.to;
            if (u == null || v == null)
                continue;
            verts.add(u);
            verts.add(v);
            indeg.set(v, (indeg.get(v) ?? 0) + 1);
            indeg.set(u, indeg.get(u) ?? 0);
        }
    }
    const q = Array.from(verts).filter(v => (indeg.get(v) ?? 0) === 0);
    const order = [];
    while (q.length) {
        const u = q.shift();
        order.push(u);
        for (const v of outNeighbors(g, u)) {
            indeg.set(v, (indeg.get(v) ?? 0) - 1);
            if ((indeg.get(v) ?? 0) === 0)
                q.push(v);
        }
    }
    return order.length === verts.size ? order : null;
}
/** SCC (Kosaraju): сначала порядок выхода в DFS, затем обход rG. */
export function scc(g) {
    const seen = new Set();
    const order = [];
    // собрать вершины
    const verts = new Set();
    const adj = g?.adj;
    if (adj instanceof Map) {
        for (const [u, set] of adj) {
            verts.add(u);
            for (const v of set)
                verts.add(v);
        }
    }
    const edges = g?.edges;
    if (Array.isArray(edges)) {
        for (const e of edges) {
            if (e?.from)
                verts.add(e.from);
            if (e?.to)
                verts.add(e.to);
        }
    }
    function dfs1(u) {
        seen.add(u);
        for (const v of outNeighbors(g, u))
            if (!seen.has(v))
                dfs1(v);
        order.push(u);
    }
    for (const v of verts)
        if (!seen.has(v))
            dfs1(v);
    const comp = [];
    const seen2 = new Set();
    function dfs2(u, bucket) {
        seen2.add(u);
        bucket.push(u);
        for (const v of inNeighbors(g, u))
            if (!seen2.has(v))
                dfs2(v, bucket);
    }
    for (let i = order.length - 1; i >= 0; i--) {
        const v = order[i];
        if (!seen2.has(v)) {
            const bucket = [];
            dfs2(v, bucket);
            comp.push(bucket);
        }
    }
    return comp;
}
