import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import { GraspController } from '../src/controller/GraspController.js';
import type { HostAdapter } from '../src/mapping/HostAdapter.js';
import type { NodeId, Range, Selection } from '../src/types.js';

const createNodeId = (...parts: number[]): NodeId => Object.freeze(parts.slice()) as NodeId;
const createRange = (start: number[], end: number[]): Range =>
  Object.freeze({
    start: createNodeId(...start),
    end: createNodeId(...end),
  }) as Range;

const createSelection = (ranges: Range[], anchor: NodeId, focus: NodeId): Selection =>
  Object.freeze({
    ranges: Object.freeze(ranges.slice()),
    anchor,
    focus,
  }) as Selection;

describe('GraspController selection normalization', () => {
  let controller: GraspController;
  let adapter: HostAdapter;

  beforeEach(() => {
    const window = new Window();
    Object.assign(globalThis, {
      window,
      document: window.document,
      DOMRect: window.DOMRect,
    });

    adapter = {
      mount: vi.fn(),
      unmount: vi.fn(),
      nodeIdFromDom: vi.fn().mockReturnValue(null),
      rangeFromDom: vi.fn().mockReturnValue(null),
      domRectsForRange: vi.fn().mockReturnValue([]),
      onRender: vi.fn().mockImplementation(() => () => {}),
    };

    controller = new GraspController(adapter);
  });

  it('normalizes and freezes selection ranges', () => {
    const unorderedRanges = [
      createRange([3, 0], [3, 2]),
      createRange([1, 1], [1, 3]),
      createRange([1, 1], [1, 3]),
    ];

    const selection = createSelection(unorderedRanges, createNodeId(2, 0), createNodeId(4, 0));
    const emissions: Selection[] = [];
    controller.on('selectionchange', (payload) => emissions.push(payload));

    controller.setSelection(selection);

    const normalized = controller.getSelection();
    expect(normalized).not.toBeNull();
    if (!normalized) {
      throw new Error('Expected a normalized selection');
    }
    expect(normalized).not.toBe(selection);
    expect(normalized.ranges.length).toBe(2);
    expect(normalized.ranges[0]).toEqual(createRange([1, 1], [1, 3]));
    expect(normalized.ranges[1]).toEqual(createRange([3, 0], [3, 2]));
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized.ranges)).toBe(true);
    expect(emissions).toHaveLength(1);
    expect(emissions[0]).toBe(normalized);
  });
});
