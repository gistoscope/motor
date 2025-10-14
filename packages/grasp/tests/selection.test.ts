import { describe, expect, it } from 'vitest';
import {
  createNodeId,
  deserializeSelection,
  serializeSelection,
  type Range,
  type Selection
} from '../src/index.js';

const makeRange = (anchor: [string, number], focus: [string, number]): Range => ({
  anchor: {
    nodeId: createNodeId(anchor[0]),
    offset: anchor[1]
  },
  focus: {
    nodeId: createNodeId(focus[0]),
    offset: focus[1]
  }
});

describe('selection serialization', () => {
  it('round-trips immutable selections', () => {
    const selection: Selection = {
      ranges: [makeRange(['node-1', 0], ['node-1', 4]), makeRange(['node-2', 1], ['node-3', 2])]
    };

    const serialized = serializeSelection(selection);
    const deserialized = deserializeSelection(serialized);

    expect(deserialized).not.toBe(selection);
    expect(deserialized.ranges[0]).not.toBe(selection.ranges[0]);
    expect(deserialized).toEqual(selection);
  });

  it('rejects invalid offsets on serialization', () => {
    const invalid: Selection = {
      ranges: [
        {
          anchor: { nodeId: createNodeId('node-1'), offset: -1 },
          focus: { nodeId: createNodeId('node-2'), offset: 3 }
        }
      ]
    };

    expect(() => serializeSelection(invalid)).toThrowError(/non-negative integer/);
  });

  it('rejects invalid node ids on deserialization', () => {
    const serialized = {
      ranges: [
        {
          anchorNodeId: '',
          anchorOffset: 0,
          focusNodeId: 'node-1',
          focusOffset: 1
        }
      ]
    } as const;

    expect(() => deserializeSelection(serialized)).toThrowError(/NodeId cannot be empty/);
  });
});
