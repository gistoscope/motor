import { describe, expect, it } from 'vitest';
import { createSpark } from '../src/index.js';
import type { SparkEvent } from '../src/core/protocol.js';

describe('spark basic scenario', () => {
  it('Select command triggers step suggestions', () => {
    const spark = createSpark();
    const events: SparkEvent[] = [];

    const unsubscribe = spark.subscribe((event) => {
      events.push(event);
    });

    spark.dispatch({ type: 'Select', target: { kind: 'token', value: 'x' } });
    unsubscribe();

    const suggestions = events.filter((e) => e.type === 'StepSuggested');
    expect(suggestions.length).toBeGreaterThan(0);

    const stateChanged = events.filter((e) => e.type === 'StateChanged');
    const lastState = (stateChanged[stateChanged.length - 1] as any)?.state;
    expect(lastState?.selection).toEqual({ kind: 'token', value: 'x' });
  });
});
