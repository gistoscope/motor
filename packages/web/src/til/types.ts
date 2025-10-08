export type NodeId = string;
export type AST = any;

export type TILOptions = {
  getPairMap?: () => Map<NodeId, NodeId> | null;
  onFocusChange?: (ids: NodeId[]) => void;
  onAction?: (payload: any) => void;
};

export type TILExecuteOptions = {
  listActions: (focus: NodeId[]) => string[];
  canApply: (rule: string, focus: NodeId[]) => boolean;
  onExecute?: (payload: { rule: string; focus: NodeId[] }) => void;
};

export type TILHandle = {
  detach(): void;
  getSelection(): NodeId[];
};
