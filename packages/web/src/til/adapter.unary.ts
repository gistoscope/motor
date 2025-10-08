import { classifyMinus, hostOfVirtual, isVirtual } from './unary';
import type { NodeId, AST } from './types';

export function toEngineFocus(_ast: AST, focus: NodeId[]): NodeId[] {
  const result: NodeId[] = [];
  const seen = new Set<NodeId>();

  for (const id of focus) {
    const resolved = isVirtual(id) ? (hostOfVirtual(id) as NodeId) : id;
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    result.push(resolved);
  }

  return result;
}

export function suggestUnaryRule(ast: AST, focus: NodeId[]): string | null {
  for (const id of focus) {
    if (!isVirtual(id) || !id.endsWith('::sign')) {
      continue;
    }

    const host = hostOfVirtual(id);
    if (classifyMinus(ast, host) === 'UnaryMinus') {
      return 'negate';
    }
  }

  return null;
}
