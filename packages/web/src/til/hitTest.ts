import { AST, NodeId } from './types.js';

export type ArrowDirection = 'left' | 'right';

export function getArrowNeighbor(
  _ast: AST,
  _currentId: NodeId | null,
  _direction: ArrowDirection,
): NodeId | null {
  return null;
}

export function getTabNeighbor(
  _ast: AST,
  _currentId: NodeId | null,
  options?: { reverse?: boolean },
): NodeId | null {
  void options;
  return null;
}
