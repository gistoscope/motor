import React, { useEffect, useMemo, useState } from 'react';
import { createHighlightController } from '../../../modules/highlight/controller';
import { HighlightLayer, useHighlightSnapshot } from '../../../modules/highlight/HighlightLayer';
import type { HighlightControllerLike, HighlightId } from '../../../modules/highlight/types';
import './highlight-demo.css';

const isTrue = (v: any) => {
  if (v === true) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
};

const EXPERIMENT_ON = isTrue(import.meta.env.VITE_EXPERIMENTAL_M0);

interface DemoToken {
  id: HighlightId;
  text: React.ReactNode;
  role?: HighlightRole;
  accent?: 'primary' | 'muted';
  bracketGroup?: string;
  highlightWith?: HighlightId[];
  interactive?: boolean;
}

interface DemoExpression {
  id: string;
  title: string;
  tokens: DemoToken[];
  footnote?: string;
}

const EXPRESSIONS: DemoExpression[] = [
  {
    id: 'series',
    title: 'Maclaurin spotlight',
    tokens: [
      {
        id: 'series-sum',
        text: (
          <span className="math-operator-block">
            âˆ‘<sub>n=0</sub>
            <sup>âˆž</sup>
          </span>
        ),
        role: 'operator',
        accent: 'muted',
      },
      { id: 'series-space-1', text: ' ', interactive: false },
      {
        id: 'series-open',
        text: '(',
        role: 'bracket',
        bracketGroup: 'series-paren',
        highlightWith: ['series-open', 'series-close', 'series-term-num', 'series-term-den'],
      },
      { id: 'series-term-num', text: 'x', accent: 'primary' },
      { id: 'series-power', text: <sup>n</sup>, accent: 'muted' },
      { id: 'series-space-2', text: ' ', interactive: false },
      { id: 'series-over', text: '/', interactive: false },
      { id: 'series-space-3', text: ' ', interactive: false },
      { id: 'series-term-den', text: 'n', accent: 'primary' },
      { id: 'series-factorial', text: '!', interactive: false },
      {
        id: 'series-close',
        text: ')',
        role: 'bracket',
        bracketGroup: 'series-paren',
        highlightWith: ['series-open', 'series-close', 'series-term-num', 'series-term-den'],
      },
      { id: 'series-space-4', text: ' ', interactive: false },
      { id: 'series-equals', text: '=', interactive: false },
      { id: 'series-space-5', text: ' ', interactive: false },
      { id: 'series-exp', text: 'e', accent: 'primary' },
      { id: 'series-exp-power', text: <sup>x</sup>, accent: 'muted' },
    ],
    footnote: 'Hover to pulse the numerator + denominator halo pair.',
  },
  {
    id: 'derivative',
    title: 'Chain rule focus',
    tokens: [
      { id: 'deriv-d', text: 'd', accent: 'muted' },
      { id: 'deriv-over', text: '/', interactive: false },
      { id: 'deriv-dx', text: 'dx', accent: 'primary' },
      { id: 'deriv-space-1', text: ' ', interactive: false },
      {
        id: 'deriv-open',
        text: '(',
        role: 'bracket',
        bracketGroup: 'deriv-paren',
        highlightWith: ['deriv-open', 'deriv-close', 'deriv-inner', 'deriv-power'],
      },
      {
        id: 'deriv-outer',
        text: 'sin',
        accent: 'primary',
        highlightWith: ['deriv-outer', 'deriv-inner'],
      },
      {
        id: 'deriv-inner-open',
        text: '(',
        role: 'bracket',
        bracketGroup: 'deriv-inner-paren',
        highlightWith: ['deriv-inner-open', 'deriv-inner-close', 'deriv-inner'],
      },
      {
        id: 'deriv-inner',
        text: 'x',
        accent: 'muted',
        highlightWith: ['deriv-outer', 'deriv-inner'],
      },
      {
        id: 'deriv-inner-close',
        text: ')',
        role: 'bracket',
        bracketGroup: 'deriv-inner-paren',
        highlightWith: ['deriv-inner-open', 'deriv-inner-close', 'deriv-inner'],
      },
      {
        id: 'deriv-power',
        text: <sup>2</sup>,
        accent: 'muted',
        highlightWith: ['deriv-open', 'deriv-close', 'deriv-inner', 'deriv-power'],
      },
      {
        id: 'deriv-close',
        text: ')',
        role: 'bracket',
        bracketGroup: 'deriv-paren',
        highlightWith: ['deriv-open', 'deriv-close', 'deriv-inner', 'deriv-power'],
      },
      { id: 'deriv-space-2', text: ' ', interactive: false },
      { id: 'deriv-equals', text: '=', interactive: false },
      { id: 'deriv-space-3', text: ' ', interactive: false },
      { id: 'deriv-result-factor', text: '2', accent: 'primary' },
      { id: 'deriv-space-4', text: ' ', interactive: false },
      { id: 'deriv-result-sin', text: 'sin', accent: 'primary' },
      {
        id: 'deriv-result-open',
        text: '(',
        role: 'bracket',
        bracketGroup: 'deriv-result-paren',
        highlightWith: ['deriv-result-open', 'deriv-result-close', 'deriv-inner'],
      },
      {
        id: 'deriv-result-inner',
        text: 'x',
        accent: 'muted',
        highlightWith: ['deriv-result-open', 'deriv-result-close', 'deriv-inner'],
      },
      {
        id: 'deriv-result-close',
        text: ')',
        role: 'bracket',
        bracketGroup: 'deriv-result-paren',
        highlightWith: ['deriv-result-open', 'deriv-result-close', 'deriv-inner'],
      },
      { id: 'deriv-space-5', text: ' ', interactive: false },
      { id: 'deriv-result-cos', text: 'cos', accent: 'primary' },
      {
        id: 'deriv-result-cos-open',
        text: '(',
        role: 'bracket',
        bracketGroup: 'deriv-result-cos-paren',
        highlightWith: ['deriv-result-cos-open', 'deriv-result-cos-close', 'deriv-inner'],
      },
      {
        id: 'deriv-result-cos-inner',
        text: 'x',
        accent: 'muted',
        highlightWith: ['deriv-result-cos-open', 'deriv-result-cos-close', 'deriv-inner'],
      },
      {
        id: 'deriv-result-cos-close',
        text: ')',
        role: 'bracket',
        bracketGroup: 'deriv-result-cos-paren',
        highlightWith: ['deriv-result-cos-open', 'deriv-result-cos-close', 'deriv-inner'],
      },
    ],
    footnote: 'Mouseover tokens to see tethered brackets breathing together.',
  },
  {
    id: 'matrix',
    title: 'Symmetric matrix energy',
    tokens: [
      {
        id: 'matrix-bracket-open',
        text: '[',
        role: 'bracket',
        bracketGroup: 'matrix-brackets',
        highlightWith: ['matrix-bracket-open', 'matrix-bracket-close', 'matrix-a11', 'matrix-a22'],
      },
      {
        id: 'matrix-row-open',
        text: '(',
        role: 'bracket',
        bracketGroup: 'matrix-row1',
        highlightWith: ['matrix-row-open', 'matrix-row-mid', 'matrix-a11'],
      },
      { id: 'matrix-a11', text: '3', accent: 'primary' },
      { id: 'matrix-comma-1', text: ', ', interactive: false },
      { id: 'matrix-a12', text: '2', accent: 'muted', highlightWith: ['matrix-a12', 'matrix-a21'] },
      {
        id: 'matrix-row-mid',
        text: ')',
        role: 'bracket',
        bracketGroup: 'matrix-row1',
        highlightWith: ['matrix-row-open', 'matrix-row-mid', 'matrix-a11'],
      },
      { id: 'matrix-space', text: ' ', interactive: false },
      {
        id: 'matrix-row-open-2',
        text: '(',
        role: 'bracket',
        bracketGroup: 'matrix-row2',
        highlightWith: ['matrix-row-open-2', 'matrix-row-close-2', 'matrix-a21', 'matrix-a22'],
      },
      { id: 'matrix-a21', text: '2', accent: 'muted', highlightWith: ['matrix-a12', 'matrix-a21'] },
      { id: 'matrix-comma-2', text: ', ', interactive: false },
      { id: 'matrix-a22', text: '5', accent: 'primary' },
      {
        id: 'matrix-row-close-2',
        text: ')',
        role: 'bracket',
        bracketGroup: 'matrix-row2',
        highlightWith: ['matrix-row-open-2', 'matrix-row-close-2', 'matrix-a21', 'matrix-a22'],
      },
      {
        id: 'matrix-bracket-close',
        text: ']',
        role: 'bracket',
        bracketGroup: 'matrix-brackets',
        highlightWith: ['matrix-bracket-open', 'matrix-bracket-close', 'matrix-a11', 'matrix-a22'],
      },
    ],
    footnote: 'Brackets stay outside glyphs; diagonals glow together.',
  },
];

const STEPS: { id: string; label: string; highlights: HighlightId[]; description: string }[] = [
  {
    id: 'series-term',
    label: 'Maclaurin term',
    highlights: ['series-open', 'series-close', 'series-term-num', 'series-term-den'],
    description: 'Halo the numerator & denominator with bracket tether.',
  },
  {
    id: 'chain-rule',
    label: 'Chain rule pairing',
    highlights: ['deriv-outer', 'deriv-inner', 'deriv-inner-open', 'deriv-inner-close'],
    description: 'Outer sine locks to inner x + parens.',
  },
  {
    id: 'matrix-energy',
    label: 'Matrix diagonals',
    highlights: ['matrix-bracket-open', 'matrix-bracket-close', 'matrix-a11', 'matrix-a22'],
    description: 'Diag entries glow with the exterior brackets.',
  },
];

interface MathTokenProps {
  token: DemoToken;
  controller: HighlightControllerLike;
  pinned: Set<HighlightId>;
  hasActive: boolean;
  isActive: boolean;
}

function MathToken({ token, controller, pinned, hasActive, isActive }: MathTokenProps) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const interactive = token.interactive !== false;
  const highlightIds = token.highlightWith ?? [token.id];

  useEffect(() => {
    if (!interactive || !ref.current) return;
    return controller.register(ref.current, {
      id: token.id,
      role: token.role as import("../../../modules/highlight/types").HighlightRole,
      accent: token.accent,
      bracketGroup: token.bracketGroup,
    });
  }, [controller, interactive, token.accent, token.bracketGroup, token.id, token.role]);

  const handleEnter = () => {
    if (!interactive) return;
    controller.pulse(highlightIds, 1);
  };

  const handleLeave = () => {
    if (!interactive) return;
    const toClear = highlightIds.filter((id) => !pinned.has(id));
    if (toClear.length) {
      controller.clear(toClear);
    }
  };

  const className = [
    'math-token',
    token.role ? `math-token--${token.role}` : null,
    token.accent ? `math-token--${token.accent}` : null,
    interactive ? 'is-interactive' : null,
    hasActive ? 'has-highlight' : null,
    isActive ? 'is-active' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      ref={interactive ? ref : null}
      className={className}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      data-highlight-id={interactive ? token.id : undefined}
    >
      {token.text}
    </span>
  );
}

export default function HighlightDemoRoute() {
  const controller = useMemo<HighlightControllerLike>(() => createHighlightController(), []);
  const snapshot = useHighlightSnapshot(controller);
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex] ?? null;

  useEffect(() => {
    controller.clear();
    if (!step) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      controller.highlight(step.highlights, 0.94);
    });
    return () => cancelAnimationFrame(frame);
  }, [controller, step]);

  useEffect(() => () => controller.clear(), [controller]);

  const handlePrev = () => {
    setStepIndex((prev) => (prev === 0 ? STEPS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setStepIndex((prev) => (prev + 1) % STEPS.length);
  };

  const pinned = useMemo(() => new Set(step ? step.highlights : []), [step]);
  const activeSet = useMemo(() => new Set(snapshot.activeIds), [snapshot.activeIds]);

  return (
    <div className="highlight-demo">
      <div className="highlight-demo__hud" role="status" aria-live="polite">
        <span className="highlight-demo__hud-dot" aria-hidden />
        <span className="highlight-demo__hud-label">VITE_EXPERIMENTAL_M0</span>
        <span className="highlight-demo__hud-value">{EXPERIMENT_ON ? 'ON' : 'OFF'}</span>
      </div>

      <header className="highlight-demo__header">
        <div>
          <h1>Highlight Lab</h1>
          <p>Dual-ring halos breathe around math glyphs with bracket tethers.</p>
        </div>
        <div className="highlight-demo__controls">
          <button type="button" onClick={handlePrev}>
            â—€ Step
          </button>
          <div className="highlight-demo__step">
            <strong>{step?.label}</strong>
            <span>{step?.description}</span>
          </div>
          <button type="button" onClick={handleNext}>
            Step â–¶
          </button>
        </div>
      </header>

      <div className="highlight-demo__grid">
        {EXPRESSIONS.map((expression) => {
          const expressionActive = expression.tokens.some((token) => activeSet.has(token.id));
          return (
            <section key={expression.id} className="highlight-demo__card">
              <h2>{expression.title}</h2>
              <div className="highlight-demo__viewport" data-active={expressionActive}>
                <div className="highlight-demo__math">
                  {expression.tokens.map((token) => (
                    <MathToken
                      key={token.id}
                      token={token}
                      controller={controller}
                      pinned={pinned}
                      hasActive={expressionActive}
                      isActive={activeSet.has(token.id)}
                    />
                  ))}
                </div>
              </div>
              {expression.footnote ? (
                <p className="highlight-demo__footnote">{expression.footnote}</p>
              ) : null}
            </section>
          );
        })}
      </div>
      <HighlightLayer controller={controller} />
    </div>
  );
}

