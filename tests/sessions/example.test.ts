/**
 * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 *
 * Source: tests/sessions/example.session.json
 * Generated at: 2025-10-18T20:07:23.012Z
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../packages/web/src/math/bridge';
import { createMathSession, withMathSession } from '../../packages/web/src/math/session';
import type {
  MathBridgeHandle,
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
} from '../../packages/web/src/math/types';

type SessionRecord = typeof SESSION_RECORD;
type SessionFrame = SessionRecord['frames'][number];

const SESSION_RECORD = {
  "name": "Example addition session",
  "description": "Recorded in a development environment to exercise log playback.",
  "initialExpression": "x",
  "frames": [
    {
      "actionId": null,
      "hostHtml": "<span data-token-id=\"var\">x</span>",
      "actions": [
        {
          "id": "add-3",
          "label": "Add three",
          "kind": "transform"
        }
      ],
      "state": {
        "ruleId": null,
        "legalActions": [
          {
            "id": "add-3",
            "label": "Add three",
            "kind": "transform"
          }
        ]
      },
      "exportSnapshot": {
        "ast": {
          "expression": "x"
        },
        "html": "<span data-token-id=\"var\">x</span>",
        "tex": "x"
      }
    },
    {
      "actionId": "add-3",
      "hostHtml": "<span data-token-id=\"var\">x</span> <span data-token-id=\"plus\">+</span> <span data-token-id=\"number\">3</span>",
      "actions": [
        {
          "id": "undo",
          "label": "Undo",
          "kind": "history"
        }
      ],
      "state": {
        "ruleId": "rule:add-3",
        "legalActions": [
          {
            "id": "undo",
            "label": "Undo",
            "kind": "history"
          }
        ]
      },
      "exportSnapshot": {
        "ast": {
          "expression": "x + 3"
        },
        "html": "<span data-token-id=\"var\">x</span> <span data-token-id=\"plus\">+</span> <span data-token-id=\"number\">3</span>",
        "tex": "x + 3"
      }
    }
  ]
} as const;
const ACTION_SEQUENCE = [
  "add-3"
] as const;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class RecordedMathEngine implements MathEngine {
  #frames: SessionFrame[];
  #index = 0;
  #host: HTMLElement | null = null;
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };

  constructor(record: SessionRecord) {
    this.#frames = record.frames.map((frame) => ({
      ...frame,
      actions: frame.actions.map((action) => ({ ...action })),
      state: frame.state ? clone(frame.state) : null,
      exportSnapshot: frame.exportSnapshot ? clone(frame.exportSnapshot) : null,
    }));
  }

  mount(host: HTMLElement, initial: string): void {
    void initial;
    this.#host = host;
    this.#index = 0;
    this.#render();
    this.#emitState();
  }

  on(event: 'hover' | 'select' | 'state', cb: MathEngineEventCallback): () => void {
    this.#listeners[event].add(cb);
    return () => {
      this.#listeners[event].delete(cb);
    };
  }

  getLegalActions(): MathEngineAction[] {
    return this.#frames[this.#index]!.actions.map((action) => ({ ...action }));
  }

  apply(actionId: string): void {
    const nextIndex = this.#index + 1;
    const nextFrame = this.#frames[nextIndex];
    if (!nextFrame || nextFrame.actionId !== actionId) {
      const expected = nextFrame?.actionId ?? '∅';
      throw new Error(`Unexpected action "${actionId}" at step ${this.#index} (expected ${expected})`);
    }
    this.#index = nextIndex;
    this.#render();
    this.#emitState();
  }

  export(): { ast: unknown; html?: string; tex?: string } {
    const frame = this.#frames[this.#index]!;
    const snapshot = frame.exportSnapshot ?? {
      ast: { step: this.#index },
      html: this.#host?.innerHTML ?? '',
    };
    return clone(snapshot);
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    const frame = this.#frames[this.#index]!;
    const overlay = this.#host.querySelector<HTMLElement>('.motor-ghost');
    const shouldRestoreOverlay = overlay && overlay.parentElement === this.#host;
    if (shouldRestoreOverlay) {
      overlay.remove();
    }
    this.#host.innerHTML = frame.hostHtml;
    if (shouldRestoreOverlay && overlay) {
      this.#host.appendChild(overlay);
    }
  }

  #emitState(): void {
    const frame = this.#frames[this.#index]!;
    const payload = frame.state ?? {
      ruleId: frame.actionId ?? null,
      legalActions: frame.actions.map((action) => ({ ...action })),
    };
    for (const cb of this.#listeners.state) {
      cb(clone(payload));
    }
  }
}

const createHostWithActions = () => {
  const host = document.createElement('div');
  host.dataset.role = 'math-host';
  const actions = document.createElement('div');
  actions.dataset.role = 'math-actions';
  document.body.append(host, actions);
  return { host, actions };
};

const escapeActionSelector = (value: string): string => {
  return value.replace(/[`\\"]/g, '\\$&');
};

const captureHostHtml = (target: HTMLElement): string => {
  const cloneNode = target.cloneNode(true) as HTMLElement;
  cloneNode.querySelector('[data-role="motor-ghost"]')?.remove();
  cloneNode.querySelector('.motor-ghost')?.remove();
  return cloneNode.innerHTML;
};

const sanitizeHtml = (html: string): string => {
  return html
    .replace(/class=(['"])(.*?)\1/g, (_match, quote: string, classValue: string) => {
      const tokens = classValue
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => !token.startsWith('motor-diff-'));
      if (tokens.length === 0) {
        return '';
      }
      return `class=${quote}${tokens.join(' ')}${quote}`;
    })
    .replace(/\s+>/g, '>');
};

const readRenderedActions = (container: HTMLElement): string[] => {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>('button[data-role="math-action"]'),
  )
    .map((button) => button.dataset.actionId ?? '')
    .filter((id) => id !== '');
};

describe('math session log » Example addition session', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    globalThis.HTMLElement = domWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  });

  afterEach(async () => {
    document.body.innerHTML = '';
    if (bridge) {
      bridge.destroy();
      bridge = null;
    }
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { navigator?: unknown }).navigator;
    delete (globalThis as { HTMLElement?: unknown }).HTMLElement;
  });

  it('replays recorded actions deterministically', async () => {
    const { host, actions } = createHostWithActions();
    const engine = new RecordedMathEngine(SESSION_RECORD);
    const { engine: sessionEngine, session } = withMathSession(engine);

    bridge = attachMathEngine({}, sessionEngine, host, {
      initialExpression: SESSION_RECORD.initialExpression,
      actionsContainer: actions,
    });

    const click = (actionId: string) => {
      const button = actions.querySelector<HTMLButtonElement>(
        `[data-action-id="${escapeActionSelector(actionId)}"]`,
      );
      expect(button).toBeTruthy();
      button?.click();
    };

    const [initialFrame, ...frames] = SESSION_RECORD.frames;
    expect(initialFrame).toBeDefined();
    expect(sanitizeHtml(captureHostHtml(host))).toBe(
      sanitizeHtml(initialFrame?.hostHtml ?? ''),
    );
    expect(readRenderedActions(actions)).toEqual(initialFrame?.actions.map((action) => action.id));

    for (const frame of frames) {
      if (!frame.actionId) {
        continue;
      }
      click(frame.actionId);
      expect(sanitizeHtml(captureHostHtml(host))).toBe(sanitizeHtml(frame.hostHtml));
      expect(readRenderedActions(actions)).toEqual(frame.actions.map((action) => action.id));
    }

    expect(session.actions).toEqual([...ACTION_SEQUENCE]);
    const exported = session.export();
    expect(exported).toEqual({ version: 1, actions: [...ACTION_SEQUENCE] });

    const replayEngine = new RecordedMathEngine(SESSION_RECORD);
    const { engine: replayProxy, session: replaySession } = withMathSession(
      replayEngine,
      createMathSession({ log: exported }),
    );

    const { host: replayHost, actions: replayActions } = createHostWithActions();
    const replayBridge = attachMathEngine({}, replayProxy, replayHost, {
      initialExpression: SESSION_RECORD.initialExpression,
      actionsContainer: replayActions,
    });

    try {
      const playback = replaySession.replay((actionId) => {
        replayProxy.apply(actionId);
      });
      try {
        await playback.play();
      } finally {
        await playback.destroy();
      }
      const lastFrame = SESSION_RECORD.frames[SESSION_RECORD.frames.length - 1]!;
      expect(sanitizeHtml(captureHostHtml(replayHost))).toBe(sanitizeHtml(lastFrame.hostHtml));
      expect(readRenderedActions(replayActions)).toEqual(
        lastFrame.actions.map((action) => action.id),
      );
    } finally {
      replayBridge.destroy();
    }
  });
});

