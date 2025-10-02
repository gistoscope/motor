import React, { useCallback, useMemo, useState } from 'react';
import {
  chooseFirstStep,
  divFractionsToReciprocal,
  mulFractionsToSingle,
  normalizeSigns,
  reduceFraction
} from '@motor/tsa';
import type { Result } from '@motor/tsa';
import styles from './StepDevRoute.module.css';

type AtomId =
  | 'divFractionsToReciprocal'
  | 'mulFractionsToSingle'
  | 'reduceFraction'
  | 'normalizeSigns';

export type StepOutcome =
  | { kind: 'idle' }
  | { kind: 'plan-success'; planId: AtomId; rationale: string[]; nextExpr: string }
  | { kind: 'plan-failure'; reasons: { code: string }[] };

const ATOM_EXECUTORS: Record<AtomId, (expr: string) => Result<{ expr: string }>> = {
  divFractionsToReciprocal,
  mulFractionsToSingle,
  reduceFraction,
  normalizeSigns
};

const EXAMPLES: string[] = [
  '((2/3) ÷ (5/7))',
  '((2/3) × (5/7))',
  '(6/8)',
  '(-2)/(-3)',
  '(5/11)'
];

type DisplayNode =
  | { kind: 'literal'; value: string; wrap: boolean }
  | { kind: 'fraction'; numerator: DisplayNode; denominator: DisplayNode; wrap: boolean }
  | { kind: 'operation'; operator: '×' | '÷'; left: DisplayNode; right: DisplayNode; wrap: boolean };

function hasOuterParentheses(source: string): boolean {
  if (!source.startsWith('(') || !source.endsWith(')')) {
    return false;
  }
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0 && index < source.length - 1) {
        return false;
      }
    }
  }
  return depth === 0;
}

function findTopLevelOperator(source: string, targets: string[]): number {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (depth === 0 && targets.includes(char)) {
      return index;
    }
  }
  return -1;
}

function parseExpression(source: string): DisplayNode {
  const trimmed = source.trim();
  if (trimmed === '') {
    return { kind: 'literal', value: '', wrap: false };
  }

  if (hasOuterParentheses(trimmed)) {
    const inner = parseExpression(trimmed.slice(1, -1));
    return { ...inner, wrap: true };
  }

  const opIndex = findTopLevelOperator(trimmed, ['×', '÷']);
  if (opIndex !== -1) {
    return {
      kind: 'operation',
      operator: trimmed[opIndex] as '×' | '÷',
      left: parseExpression(trimmed.slice(0, opIndex)),
      right: parseExpression(trimmed.slice(opIndex + 1)),
      wrap: false
    };
  }

  const slashIndex = findTopLevelOperator(trimmed, ['/']);
  if (slashIndex !== -1) {
    return {
      kind: 'fraction',
      numerator: parseExpression(trimmed.slice(0, slashIndex)),
      denominator: parseExpression(trimmed.slice(slashIndex + 1)),
      wrap: false
    };
  }

  return { kind: 'literal', value: trimmed, wrap: false };
}

function wrapContent(content: React.ReactNode): React.ReactNode {
  return (
    <span className={styles.group}>
      <span className={styles.paren}>(</span>
      <span className={styles.groupInner}>{content}</span>
      <span className={styles.paren}>)</span>
    </span>
  );
}

function renderNode(node: DisplayNode): React.ReactNode {
  if (node.kind === 'literal') {
    const literal = <span className={styles.literal}>{node.value}</span>;
    return node.wrap ? wrapContent(literal) : literal;
  }

  if (node.kind === 'fraction') {
    const fraction = (
      <span className={styles.fraction}>
        <span className={styles.fracPart}>{renderNode(node.numerator)}</span>
        <span className={styles.fracBar} />
        <span className={styles.fracPart}>{renderNode(node.denominator)}</span>
      </span>
    );
    return node.wrap ? wrapContent(fraction) : fraction;
  }

  const operation = (
    <span className={styles.operation}>
      {renderNode(node.left)}
      <span className={styles.operatorSymbol}>{node.operator}</span>
      {renderNode(node.right)}
    </span>
  );
  return node.wrap ? wrapContent(operation) : operation;
}

function ExpressionDisplay({ value, ...rest }: { value: string; 'aria-label': string }) {
  const rendered = useMemo(() => renderNode(parseExpression(value)), [value]);
  return (
    <div {...rest} className={styles.katexWrap}>
      {rendered}
    </div>
  );
}

export function evaluateFirstStep(expression: string): StepOutcome {
  const source = expression.trim();
  if (source === '') {
    return { kind: 'plan-failure', reasons: [{ code: 'PRECONDITION_FAILED' }] };
  }

  const planResult = chooseFirstStep(source);
  if (!planResult.ok) {
    return { kind: 'plan-failure', reasons: planResult.reasons };
  }

  const plan = planResult.value;
  const executor = ATOM_EXECUTORS[plan.id as AtomId];
  if (!executor) {
    return { kind: 'plan-failure', reasons: [{ code: 'UNKNOWN_ATOM' }] };
  }

  const next = executor(source);
  if (!next.ok) {
    return { kind: 'plan-failure', reasons: next.reasons };
  }

  return { kind: 'plan-success', planId: plan.id as AtomId, rationale: plan.rationale, nextExpr: next.value.expr };
}

export function resolveTextareaKey(event: {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}): 'apply' | 'clear' | null {
  if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    return 'apply';
  }
  if (event.key === 'Escape') {
    return 'clear';
  }
  return null;
}

function isDevRouteEnabled(): boolean {
  return import.meta.env?.VITE_EXPERIMENTAL_M0 === 'true';
}

export default function StepDevRoute() {
  const [expression, setExpression] = useState<string>(EXAMPLES[0]);
  const [outcome, setOutcome] = useState<StepOutcome>({ kind: 'idle' });

  const enabled = isDevRouteEnabled();

  const handleApply = useCallback(() => {
    setOutcome(evaluateFirstStep(expression));
  }, [expression]);

  const handleClear = useCallback(() => {
    setExpression('');
    setOutcome({ kind: 'idle' });
  }, []);

  const handleTextareaKey = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const action = resolveTextareaKey(event);
      if (action === 'apply') {
        event.preventDefault();
        handleApply();
      } else if (action === 'clear') {
        event.preventDefault();
        handleClear();
      }
    },
    [handleApply, handleClear]
  );

  if (!enabled) {
    return null;
  }

  return (
    <div className={styles.container} data-testid="dev-step-container">
      <aside className={styles.examples} aria-label="Examples list">
        <div className={styles.examplesHeading}>Examples</div>
        {EXAMPLES.map((item) => (
          <button
            key={item}
            type="button"
            className={styles.exampleButton}
            onClick={() => {
              setExpression(item);
              setOutcome({ kind: 'idle' });
            }}
          >
            {item}
          </button>
        ))}
      </aside>
      <div className={styles.mainColumn} data-testid="dev-step-stack">
        <div className={styles.displayPanel} data-testid="display-panel">
          <ExpressionDisplay value={expression} aria-label="Rendered expression" />
        </div>
        {outcome.kind === 'plan-success' && (
          <div className={styles.resultPanel} data-testid="result-panel">
            <div className={styles.resultTitle}>First step: {outcome.planId}</div>
            <div>Rationale:</div>
            <ul className={styles.reasonList}>
              {outcome.rationale.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className={styles.resultExpression} aria-label="Transformed expression">
              {outcome.nextExpr}
            </div>
          </div>
        )}
        {outcome.kind === 'plan-failure' && (
          <div className={styles.resultPanel} data-testid="result-panel">
            <div className={styles.resultTitle}>No step available</div>
            <div>Reasons:</div>
            <ul className={styles.reasonList}>
              {outcome.reasons.map((reason) => (
                <li key={reason.code}>{reason.code}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={styles.inputPanel} data-testid="input-panel">
          <label htmlFor="dev-step-input" style={{ fontWeight: 600 }}>
            Expression input
          </label>
          <textarea
            id="dev-step-input"
            className={styles.textarea}
            aria-label="Expression input (LaTeX/ASCII)"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onKeyDown={handleTextareaKey}
            style={{ resize: 'vertical' }}
          />
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={handleApply}>
              Apply
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
