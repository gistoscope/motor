export type NodeId = readonly number[];

export interface Range {
  readonly start: NodeId;
  readonly end: NodeId;
}

export interface Selection {
  readonly anchor: NodeId;
  readonly focus: NodeId;
  readonly ranges: readonly Range[];
}
