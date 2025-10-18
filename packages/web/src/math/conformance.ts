import { beforeEach, describe, expect, it } from 'vitest';

import type { MathEngine, MathEngineAction } from './types';

export interface MathEngineContractSpec {
  /**
   * Human readable name of the engine that will appear in the test output.
   */
  name: string;
  /**
   * Factory that must return a _fresh_ engine instance for each test.
   */
  createEngine(): MathEngine;
  /**
   * Expression that will be provided when the engine is mounted.
   *
   * Defaults to a minimal placeholder expression.
   */
  initialExpression?: string;
}

const assertValidAction = (action: MathEngineAction, seen: Set<string>): void => {
  expect(action).toBeDefined();
  expect(typeof action.id).toBe('string');
  expect(action.id.length).toBeGreaterThan(0);
  expect(seen.has(action.id)).toBe(false);
  seen.add(action.id);

  expect(typeof action.label).toBe('string');
  expect(action.label.length).toBeGreaterThan(0);

  expect(typeof action.kind).toBe('string');
  expect(action.kind.length).toBeGreaterThan(0);
};

const assertSerializable = (value: unknown): void => {
  expect(() => {
    JSON.stringify(value);
  }).not.toThrow();
};

export const describeMathEngineContract = ({
  name,
  createEngine,
  initialExpression = 'x',
}: MathEngineContractSpec): void => {
  describe(`[math-engine] contract · ${name}`, () => {
    let host: HTMLElement;

    beforeEach(() => {
      host = document.createElement('div');
    });

    const mount = (): MathEngine => {
      const engine = createEngine();
      expect(() => engine.mount(host, initialExpression)).not.toThrow();
      return engine;
    };

    it('mounts into the provided host element', () => {
      const engine = createEngine();
      expect(() => engine.mount(host, initialExpression)).not.toThrow();
      expect(host instanceof HTMLElement).toBe(true);
    });

    it('provides a functional unsubscription handle for events', () => {
      const engine = mount();
      const cleanup = engine.on('state', () => {});
      expect(typeof cleanup).toBe('function');
      expect(() => cleanup()).not.toThrow();
      expect(() => cleanup()).not.toThrow();
    });

    it('returns well-formed legal actions', () => {
      const engine = mount();
      const actions = engine.getLegalActions();
      expect(Array.isArray(actions)).toBe(true);
      const seen = new Set<string>();
      for (const action of actions) {
        assertValidAction(action, seen);
      }
    });

    it('supports applying returned action identifiers', () => {
      const engine = mount();
      const [firstAction] = engine.getLegalActions();
      if (!firstAction) {
        return;
      }
      expect(() => engine.apply(firstAction.id)).not.toThrow();
    });

    it('exports a serialisable snapshot with the AST payload', () => {
      const engine = mount();
      const snapshot = engine.export();
      expect(snapshot).toBeDefined();
      expect(snapshot).not.toBeNull();
      expect(typeof snapshot).toBe('object');
      expect('ast' in snapshot).toBe(true);
      expect(snapshot.ast).not.toBeUndefined();
      assertSerializable(snapshot.ast);

      if ('html' in snapshot && snapshot.html !== undefined) {
        expect(typeof snapshot.html).toBe('string');
      }
      if ('tex' in snapshot && snapshot.tex !== undefined) {
        expect(typeof snapshot.tex).toBe('string');
      }
    });
  });
};
