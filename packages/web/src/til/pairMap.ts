import { NodeId } from './types';

let pairMapGetter: (() => Map<NodeId, NodeId> | null) | null = null;

export function registerPairMap(
  getter: (() => Map<NodeId, NodeId> | null) | null,
): void {
  pairMapGetter = getter;
}

export function pairFor(id: NodeId): [NodeId, NodeId] | null {
  const map = pairMapGetter ? pairMapGetter() : null;
  if (!map) {
    return null;
  }

  const paired = map.get(id);
  if (paired) {
    return [id, paired];
  }

  for (const [key, value] of map.entries()) {
    if (value === id) {
      return [key, value];
    }
  }

  return null;
}
