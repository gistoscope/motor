export type AST = any;
export type NodeId = string;

export function isOperatorChar(ch: string): boolean {
  return ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^';
}

export function getTokenText(ast: AST, id: NodeId): string {
  try {
    // @ts-ignore
    const t = ast?.tokens?.[id]?.text ?? ast?.byId?.[id]?.text ?? '';
    return typeof t === 'string' ? t : '';
  } catch {
    return '';
  }
}

export function getNeighbors(ast: AST, id: NodeId): { left?: NodeId; right?: NodeId } {
  try {
    // @ts-ignore
    const order: NodeId[] = ast?.linear ?? [];
    const i = order.indexOf(id);
    if (i < 0) return {};
    return { left: order[i - 1], right: order[i + 1] };
  } catch {
    return {};
  }
}

export function getOwnerId(ast: any, id: NodeId): NodeId | null {
  try {
    const o = (ast as any)?.owner?.[id];
    return typeof o === 'string' ? o : null;
  } catch {
    return null;
  }
}

export function isParenRole(el: Element | null): boolean {
  const role = el?.getAttribute?.('data-ast-role');
  return role === 'paren-open' || role === 'paren-close';
}
