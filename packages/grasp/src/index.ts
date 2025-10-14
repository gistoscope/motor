export type NodeId = string & { readonly __nodeIdBrand: unique symbol };

export interface RangeBoundary {
  readonly nodeId: NodeId;
  readonly offset: number;
}

export interface Range {
  readonly anchor: RangeBoundary;
  readonly focus: RangeBoundary;
}

export interface Selection {
  readonly ranges: readonly Range[];
}

export interface SerializedRange {
  readonly anchorNodeId: string;
  readonly anchorOffset: number;
  readonly focusNodeId: string;
  readonly focusOffset: number;
}

export interface SerializedSelection {
  readonly ranges: readonly SerializedRange[];
}

export interface HostAdapter {
  readonly name: string;
  readSelection(): Selection | null;
  writeSelection(selection: Selection): void;
}

const asNodeId = (value: string): NodeId => {
  if (value.length === 0) {
    throw new Error('NodeId cannot be empty.');
  }
  return value as NodeId;
};

const assertValidOffset = (offset: number, label: string): void => {
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`${label} offset must be a non-negative integer.`);
  }
};

const assertValidRange = (range: Range): void => {
  assertValidOffset(range.anchor.offset, 'Anchor');
  assertValidOffset(range.focus.offset, 'Focus');
};

const cloneRange = (range: Range): Range => ({
  anchor: {
    nodeId: range.anchor.nodeId,
    offset: range.anchor.offset
  },
  focus: {
    nodeId: range.focus.nodeId,
    offset: range.focus.offset
  }
} satisfies Range);

const cloneSelection = (selection: Selection): Selection => ({
  ranges: selection.ranges.map((range) => cloneRange(range))
} satisfies Selection);

export const serializeSelection = (selection: Selection): SerializedSelection => {
  const ranges = selection.ranges.map((range) => {
    assertValidRange(range);
    return {
      anchorNodeId: range.anchor.nodeId,
      anchorOffset: range.anchor.offset,
      focusNodeId: range.focus.nodeId,
      focusOffset: range.focus.offset
    } satisfies SerializedRange;
  });

  return { ranges } satisfies SerializedSelection;
};

export const deserializeSelection = (serialized: SerializedSelection): Selection => {
  const ranges = serialized.ranges.map((range) => {
    assertValidOffset(range.anchorOffset, 'Anchor');
    assertValidOffset(range.focusOffset, 'Focus');

    return {
      anchor: {
        nodeId: asNodeId(range.anchorNodeId),
        offset: range.anchorOffset
      },
      focus: {
        nodeId: asNodeId(range.focusNodeId),
        offset: range.focusOffset
      }
    } satisfies Range;
  });

  return { ranges } satisfies Selection;
};

export class GraspController {
  private latest: Selection | null = null;

  constructor(private readonly host: HostAdapter) {}

  read(): Selection | null {
    const selection = this.host.readSelection();
    this.latest = selection ? cloneSelection(selection) : null;
    return this.latest ? cloneSelection(this.latest) : null;
  }

  write(selection: Selection): void {
    const copy = cloneSelection(selection);
    this.host.writeSelection(copy);
    this.latest = copy;
  }

  get lastSelection(): Selection | null {
    return this.latest ? cloneSelection(this.latest) : null;
  }
}

export const createNodeId = (value: string): NodeId => asNodeId(value);
