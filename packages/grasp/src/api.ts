import type { GraspEdge, GraspId, GraspNode } from './types';

export { GraspId, GraspNode, GraspEdge };

export function makeId(s: string): GraspId {
  return s as GraspId;
}

export function node(id: GraspId, label: string): GraspNode {
  return { id, label };
}

export function edge(from: GraspId, to: GraspId, label?: string): GraspEdge {
  return { from, to, label };
}
