import React, { useCallback, useMemo, useState } from 'react';
import {
  applyNextRule,
  evaluateExpression,
  formatRational,
  formatStage1,
  parseStage1Expression
} from '@motor/tsa';
import type { AST } from '@motor/tsa';
import styles from './StepDevRoute.module.css';

export type TraceStep = {
  rule: string;
  rationale: string[];
  expression: string;
};

export type StepOutcome =
  | { kind: 'idle' }
  | { kind: 'trace'; steps: TraceStep[]; finalExpression: string; finalValue: string }
  | { kind: 'error'; message: string };

const EXAMPLES: string[] = [
  '((2/3) ÷ (5/7))',
  '((3/4) × (8/9))',
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

function applyTrace(ast: AST): { steps: TraceStep[]; finalExpression: string; finalValue: string } | { error: string } {
  const steps: TraceStep[] = [];
  let current: AST = ast;

  while (true) {
    const result = applyNextRule(current);
    if (!result) {
      break;
    }
    current = result.ast;
    steps.push({
      rule: result.rule,
      rationale: result.rationale,
      expression: formatStage1(current)
    });
  }

  const evaluated = evaluateExpression(current);
  if ('error' in evaluated) {
    return { error: evaluated.error };
  }

  return {
    steps,
    finalExpression: formatStage1(current),
    finalValue: formatRational(evaluated)
  };
}

export function evaluateTrace(expression: string): StepOutcome {
  const source = expression.trim();
  if (source === '') {
    return { kind: 'error', message: 'Expression is empty.' };
  }

  try {
    const ast = parseStage1Expression(source);
    const trace = applyTrace(ast);
    if ('error' in trace) {
      return { kind: 'error', message: trace.error };
    }
    return {
      kind: 'trace',
      steps: trace.steps,
      finalExpression: trace.finalExpression,
      finalValue: trace.finalValue
    };
  } catch (error) {
    if (error instanceof Error) {
      return { kind: 'error', message: error.message };
    }
    return { kind: 'error', message: 'Unknown error' };
  }
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
    setOutcome(evaluateTrace(expression));
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
        {outcome.kind === 'trace' && (
          <div className={styles.resultPanel} data-testid="result-panel">
            <div className={styles.resultTitle}>Trace</div>
            <ol className={styles.traceList}>
              {outcome.steps.map((step, index) => (
                <li key={`${step.rule}-${index}`} className={styles.traceItem}>
                  <div className={styles.traceHeading}>
                    <span className={styles.traceIndex}>Step {index + 1}:</span>
                    <span className={styles.traceRule}>{step.rule}</span>
                  </div>
                  <div className={styles.traceExpression}>{step.expression}</div>
                  <ul className={styles.reasonList}>
                    {step.rationale.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
            <div className={styles.finalSummary}>
              <div className={styles.resultTitle}>Final expression</div>
              <div className={styles.resultExpression}>{outcome.finalExpression}</div>
              <div className={styles.finalValue}>Normalized value: {outcome.finalValue}</div>
            </div>
          </div>
        )}
        {outcome.kind === 'error' && (
          <div className={styles.resultPanel} data-testid="result-panel">
            <div className={styles.resultTitle}>Unable to compute</div>
            <div className={styles.errorMessage}>{outcome.message}</div>
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
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleApply}
              data-testid="apply-button"
            >
              Apply
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleClear}
              data-testid="clear-button"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
