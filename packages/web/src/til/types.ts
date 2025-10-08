export type NodeId = string;
export type AST = any;

export type TILOptions = {
  getPairMap?: () => Map<NodeId, NodeId> | null;
  onFocusChange?: (ids: NodeId[]) => void;
  onAction?: (payload: any) => void;
};

export type TILHandle = {
  detach(): void;
  getSelection(): NodeId[];
};
