export type GraphJSON = {
  nodes: Array<{ id: string; label?: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
};
