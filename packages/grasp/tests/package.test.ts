import { describe, expect, it, vi } from 'vitest';
import {
  GraspController,
  createNodeId,
  type HostAdapter,
  type Selection
} from '../src/index.js';

describe('@motor/grasp', () => {
  it('constructs and coordinates with a host adapter', () => {
    const selection: Selection = {
      ranges: [
        {
          anchor: { nodeId: createNodeId('node-1'), offset: 0 },
          focus: { nodeId: createNodeId('node-1'), offset: 2 }
        }
      ]
    };

    const host: HostAdapter = {
      name: 'test-host',
      readSelection: vi.fn(() => selection),
      writeSelection: vi.fn()
    };

    const controller = new GraspController(host);
    expect(controller.read()).toEqual(selection);
    controller.write(selection);
    expect(host.writeSelection).toHaveBeenCalled();
    expect(controller.lastSelection).toEqual(selection);
  });
});
