export function createAttrs() {
    return { node: new Map(), edge: new Map() };
}
export function edgeKey(from, to) {
    return `${String(from)}->${String(to)}`;
}
export function setNodeAttr(a, id, key, value) {
    if (!a.node.has(id))
        a.node.set(id, new Map());
    a.node.get(id).set(key, value);
}
export function getNodeAttr(a, id, key) {
    return a.node.get(id)?.get(key);
}
export function deleteNodeAttr(a, id, key) {
    const m = a.node.get(id);
    if (!m)
        return false;
    const ok = m.delete(key);
    if (m.size === 0)
        a.node.delete(id);
    return ok;
}
export function setEdgeAttr(a, from, to, key, value) {
    const k = edgeKey(from, to);
    if (!a.edge.has(k))
        a.edge.set(k, new Map());
    a.edge.get(k).set(key, value);
}
export function getEdgeAttr(a, from, to, key) {
    return a.edge.get(edgeKey(from, to))?.get(key);
}
export function deleteEdgeAttr(a, from, to, key) {
    const k = edgeKey(from, to);
    const m = a.edge.get(k);
    if (!m)
        return false;
    const ok = m.delete(key);
    if (m.size === 0)
        a.edge.delete(k);
    return ok;
}
export function purgeDanglingAttrs(a, g) {
    for (const id of Array.from(a.node.keys())) {
        if (!g.adj.has(id))
            a.node.delete(id);
    }
    for (const k of Array.from(a.edge.keys())) {
        const [from, to] = k.split('->');
        if (!g.adj.has(from) || !g.adj.get(from).has(to)) {
            a.edge.delete(k);
        }
    }
}
