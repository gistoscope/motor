export function makeId(s) {
    return s;
}
export function node(id, label) {
    return { id, label };
}
export function edge(from, to, label) {
    return { from, to, label };
}
