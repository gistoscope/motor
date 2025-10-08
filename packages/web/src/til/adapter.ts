import { AST, NodeId } from './types';

export type ActionDescriptor = {
  id: string;
  label: string;
};

export function listActions(_focus: NodeId[]): ActionDescriptor[] {
  return [];
}

export function canApply(_rule: ActionDescriptor, _focus: NodeId[]): boolean {
  return false;
}

export function virtApply(
  _rule: ActionDescriptor,
  _focus: NodeId[],
  _ast: AST,
): AST {
  return _ast;
}
