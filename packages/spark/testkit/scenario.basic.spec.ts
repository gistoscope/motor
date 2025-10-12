import { describe, expect, it } from 'vitest';
import { createSpark } from '../src/index.js';
import type { SparkEvent } from '../src/core/protocol.js';

describe('spark basic scenario', () => {
  it('walks through the selection workflow', () => {
    const spark = createSpark();
    const collected: SparkEvent[] = [];
    spark.attach(event => {
      collected.push(event);
    });

    const [selection] = spark.dispatch({ type: 'select', selection: 'alpha' });
    expect(selection).toMatchObject({ type: 'selection.changed', selection: 'alpha' });
    expect(spark.state.selection).toBe('alpha');

    const [preview] = spark.dispatch({ type: 'preview', selection: 'beta' });
    expect(preview).toMatchObject({ type: 'preview.changed', selection: 'beta' });
    expect(spark.state.preview).toBe('beta');

    const [hint] = spark.dispatch({ type: 'hint', message: 'consider beta' });
    expect(hint).toMatchObject({ type: 'hint.provided', message: 'consider beta' });
    expect(spark.state.lastHint).toBe('consider beta');

    const [applyError] = spark.dispatch({ type: 'apply' });
    expect(applyError.type).toBe('error');
    expect(applyError.error.kind).toBe('UNIMPL');

    const [undoError] = spark.dispatch({ type: 'undo' });
    expect(undoError.type).toBe('error');
    expect(undoError.error.kind).toBe('UNIMPL');

    const [redoError] = spark.dispatch({ type: 'redo' });
    expect(redoError.type).toBe('error');
    expect(redoError.error.kind).toBe('UNIMPL');

    expect(collected).toHaveLength(6);
    expect(spark.history).toHaveLength(6);
    expect(spark.snapshot()).toMatchObject({
      selection: 'alpha',
      preview: 'beta',
      lastHint: 'consider beta'
    });
  });
});
