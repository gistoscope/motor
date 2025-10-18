import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { createMathSession } from '../../web/src/math/session';
import { createSessionPlayer } from '../../web/src/ui/player';
import type { MathEngine, MathEngineAction, MathEngineEventCallback } from '../../web/src/math/types';

interface StepState {
  id: string;
  html: string;
}

const STEP_STATES: StepState[] = [
  { id: 'start', html: '<div data-step="0">0</div>' },
  { id: 'step-1', html: '<div data-step="1">1</div>' },
  { id: 'step-2', html: '<div data-step="2">2</div>' },
  { id: 'step-3', html: '<div data-step="3">3</div>' },
];

class MockPlayerEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #states: readonly StepState[];
  #index = 0;

  constructor(states: readonly StepState[]) {
    this.#states = states;
  }

  mount(host: HTMLElement, initial: string): void {
    this.#host = host;
    const initialIndex = this.#states.findIndex((state) => state.id === initial);
    this.#index = initialIndex >= 0 ? initialIndex : 0;
    this.#render();
  }

  on(_event: string, _cb: MathEngineEventCallback): () => void {
    return () => {};
  }

  getLegalActions(): MathEngineAction[] {
    return this.#states.slice(1).map((state) => ({ id: state.id, label: state.id, kind: 'transform' }));
  }

  apply(actionId: string): void {
    const nextIndex = this.#states.findIndex((state) => state.id === actionId);
    if (nextIndex === -1) {
      return;
    }
    this.#index = nextIndex;
    this.#render();
  }

  export(): { ast: unknown; html?: string | undefined; tex?: string | undefined } {
    return {
      ast: { expression: this.#states[this.#index]?.id ?? '' },
      html: this.#host?.innerHTML ?? '',
    };
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    this.#host.innerHTML = this.#states[this.#index]?.html ?? '';
  }
}

describe('math session player', () => {
  let domWindow: Window;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    globalThis.HTMLElement = domWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { navigator?: unknown }).navigator;
    delete (globalThis as { HTMLElement?: unknown }).HTMLElement;
  });

  it('keeps DOM consistent when stepping and seeking through a log', async () => {
    const log = { version: 1 as const, actions: STEP_STATES.slice(1).map((state) => state.id) };

    const stepSession = createMathSession({ log });
    const seekSession = createMathSession({ log });

    const stepHost = document.createElement('div');
    const seekHost = document.createElement('div');

    const stepEngine = new MockPlayerEngine(STEP_STATES);
    const seekEngine = new MockPlayerEngine(STEP_STATES);

    stepEngine.mount(stepHost, STEP_STATES[0]!.id);
    seekEngine.mount(seekHost, STEP_STATES[0]!.id);

    const stepReplay = stepSession.replay((actionId) => stepEngine.apply(actionId), {
      onReset: () => stepEngine.mount(stepHost, STEP_STATES[0]!.id),
      delayMs: 0,
    });
    const seekReplay = seekSession.replay((actionId) => seekEngine.apply(actionId), {
      onReset: () => seekEngine.mount(seekHost, STEP_STATES[0]!.id),
      delayMs: 0,
    });

    const stepStates: string[] = [];
    while (await stepReplay.step()) {
      stepStates.push(stepHost.innerHTML);
    }

    await seekReplay.seek(0);
    const seekStates: string[] = [];
    for (let index = 1; index <= seekReplay.total; index += 1) {
      await seekReplay.seek(index);
      seekStates.push(seekHost.innerHTML);
    }

    expect(seekStates).toEqual(stepStates);

    await stepReplay.destroy();
    await seekReplay.destroy();
  });

  it('renders session player controls and updates playback state', async () => {
    const log = { version: 1 as const, actions: STEP_STATES.slice(1).map((state) => state.id) };
    const session = createMathSession({ log });

    const host = document.createElement('div');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const engine = new MockPlayerEngine(STEP_STATES);
    engine.mount(host, STEP_STATES[0]!.id);

    const player = createSessionPlayer(container, {
      session,
      apply: (actionId) => engine.apply(actionId),
      onReset: () => engine.mount(host, STEP_STATES[0]!.id),
      delayMs: 0,
    });

    const playback = player.getPlayback();
    expect(playback).toBeTruthy();
    expect(container.dataset.role).toBe('math-session-player');

    const counter = container.querySelector('[data-role="math-session-player-counter"]');
    expect(counter?.textContent).toBe('0/3');

    await playback?.step();
    expect(host.innerHTML).toBe(STEP_STATES[1]!.html);
    expect(counter?.textContent).toBe('1/3');

    await playback?.seek(3);
    expect(host.innerHTML).toBe(STEP_STATES[3]!.html);
    expect(counter?.textContent).toBe('3/3');

    const timeline = container.querySelector<HTMLInputElement>('[data-role="math-session-player-timeline"]');
    expect(timeline?.value).toBe('3');

    await player.refresh();
    const refreshed = player.getPlayback();
    expect(refreshed?.index).toBe(0);

    await player.destroy();
  });
});
