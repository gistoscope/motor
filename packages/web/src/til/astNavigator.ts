export type AST = any;
export type NodeId = string;

export type NodeKind =
  | 'Frac'
  | 'Pow'
  | 'Sqrt'
  | 'Paren'
  | 'Atom'
  | 'Unknown';

export type NodeSpan = NodeId[];

export function kindOf(ast: AST, id: NodeId): NodeKind {
  try {
    // @ts-ignore
    const n = ast?.byId?.[id];
    if (n?.type === 'Fraction' || n?.kind === 'Frac') return 'Frac';
    if (n?.type === 'Power' || n?.kind === 'Pow') return 'Pow';
    if (n?.type === 'Sqrt' || n?.kind === 'Sqrt') return 'Sqrt';
    if (n?.type === 'Paren' || n?.kind === 'Paren') return 'Paren';
    if (n?.type === 'Atom' || n?.kind === 'Atom') return 'Atom';
    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export function pairFor(ast: AST, id: NodeId): [NodeId, NodeId] | null {
  try {
    // @ts-ignore
    const open = ast?.pairs?.[id];
    if (open) return open;
    // @ts-ignore
    const order: NodeId[] = ast?.linear ?? [];
    const text = (ast?.tokens?.[id]?.text ?? '').toString();
    if (text !== '(' && text !== ')') return null;
    const idx = order.indexOf(id);
    if (idx < 0) return null;

    let depth = 0;
    if (text === '(') {
      for (let i = idx; i < order.length; i++) {
        const t = (ast?.tokens?.[order[i]]?.text ?? '').toString();
        if (t === '(') depth++;
        if (t === ')') depth--;
        if (depth === 0) return [id, order[i]];
      }
    } else {
      for (let i = idx; i >= 0; i--) {
        const t = (ast?.tokens?.[order[i]]?.text ?? '').toString();
        if (t === ')') depth++;
        if (t === '(') depth--;
        if (depth === 0) return [order[i], id];
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function spanForNode(ast: AST, seedId: NodeId): NodeSpan {
  try {
    // @ts-ignore
    const owner = ast?.owner?.[seedId];
    if (owner) {
      // @ts-ignore
      const span: NodeId[] = ast?.nodes?.[owner]?.span ?? [];
      if (span?.length) return span.slice();
    }

    // @ts-ignore
    const tok = (ast?.tokens?.[seedId]?.text ?? '').toString();
    if (tok === '(' || tok === ')') {
      const p = pairFor(ast, seedId);
      if (p) {
        // @ts-ignore
        const order: NodeId[] = ast?.linear ?? [];
        const a = order.indexOf(p[0]);
        const b = order.indexOf(p[1]);
        if (a >= 0 && b >= 0 && a <= b) return order.slice(a, b + 1);
      }
      return [seedId];
    }

    // @ts-ignore
    const order: NodeId[] = ast?.linear ?? [];
    const i = order.indexOf(seedId);
    if (i < 0) return [seedId];
    let l = i;
    let r = i;
    const stop = new Set(['+', '-', '*', '/', '^', '(', ')']);
    while (l - 1 >= 0) {
      const t = (ast?.tokens?.[order[l - 1]]?.text ?? '').toString();
      if (stop.has(t)) break;
      l--;
    }
    while (r + 1 < order.length) {
      const t = (ast?.tokens?.[order[r + 1]]?.text ?? '').toString();
      if (stop.has(t)) break;
      r++;
    }
    return order.slice(l, r + 1);
  } catch {
    return [seedId];
  }
}

export function expandToNode(ast: AST, seed: NodeId): NodeSpan {
  const k = kindOf(ast, seed);
  if (k === 'Paren') return spanForNode(ast, seed);
  if (k === 'Frac' || k === 'Pow' || k === 'Sqrt') return spanForNode(ast, seed);
  return spanForNode(ast, seed);
}
