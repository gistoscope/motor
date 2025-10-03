import React, { useCallback, useMemo, useState } from 'react';
import {
  applyNextRule,
  evaluateExpression,
  formatRational,
  formatStage2,
  listRuleApplications,
  parseStage2Expression,
  type AST,
  type StepApplication
} from '@motor/tsa';
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
  '((2/3) + (5/7))',
  '((2/3) - (5/7))',
  '(-2)/(-3)'
];

type DisplayNode =
  | { kind: 'literal'; value: string; wrap: boolean }
  | { kind: 'fraction'; numerator: DisplayNode; denominator: DisplayNode; wrap: boolean }
  | {
      kind: 'operation';
      operator: '×' | '÷' | '+' | '-';
      left: DisplayNode;
      right: DisplayNode;
      wrap: boolean;
    };

type TraceSnapshot = {
  ast: AST;
  expression: string;
  rule: string | null;
  rationale: string[];
};

type TraceSession = {
  history: TraceSnapshot[];
  index: number;
};

type RuleOption = StepApplication & { preview: string };

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
      if ((char === '+' || char === '-') && index === 0) {
        continue;
      }
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

  const addIndex = findTopLevelOperator(trimmed, ['+', '-']);
  if (addIndex > 0) {
    const operator = trimmed[addIndex] as '+' | '-';
    return {
      kind: 'operation',
      operator,
      left: parseExpression(trimmed.slice(0, addIndex)),
      right: parseExpression(trimmed.slice(addIndex + 1)),
      wrap: false
    };
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
      expression: formatStage2(current)
    });
  }

  const evaluated = evaluateExpression(current);
  if ('error' in evaluated) {
    return { error: evaluated.error };
  }

  return {
    steps,
    finalExpression: formatStage2(current),
    finalValue: formatRational(evaluated)
  };
}

export function evaluateTrace(expression: string): StepOutcome {
  const source = expression.trim();
  if (source === '') {
    return { kind: 'error', message: 'Expression is empty.' };
  }

  try {
    const ast = parseStage2Expression(source);
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

function createSnapshot(ast: AST, rule: string | null, rationale: string[]): TraceSnapshot {
  return {
    ast,
    expression: formatStage2(ast),
    rule,
    rationale
  };
}

export default function StepDevRoute() {
  const [expression, setExpression] = useState<string>(EXAMPLES[0]);
  const [session, setSession] = useState<TraceSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = isDevRouteEnabled();

  const currentSnapshot = session ? session.history[session.index] : null;
  const currentAst = currentSnapshot?.ast ?? null;
  const displayExpression = currentSnapshot?.expression ?? expression;

  const ruleOptions = useMemo<RuleOption[]>(() => {
    if (!currentAst) {
      return [];
    }
    return listRuleApplications(currentAst).map((option) => ({
      ...option,
      preview: formatStage2(option.ast)
    }));
  }, [currentAst]);

  const evaluation = useMemo(() => {
    if (!currentAst) {
      return null;
    }
    return evaluateExpression(currentAst);
  }, [currentAst]);

  const normalizedValue = useMemo(() => {
    if (!evaluation || 'error' in evaluation) {
      return null;
    }
    return formatRational(evaluation);
  }, [evaluation]);

  const evaluationError = useMemo(() => {
    if (!evaluation || !('error' in evaluation)) {
      return null;
    }
    return evaluation.error;
  }, [evaluation]);

  const handleApply = useCallback(() => {
    const source = expression.trim();
    if (source === '') {
      setError('Expression is empty.');
      setSession(null);
      return;
    }

    try {
      const ast = parseStage2Expression(source);
      const snapshot = createSnapshot(ast, null, []);
      setSession({ history: [snapshot], index: 0 });
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error');
      }
      setSession(null);
    }
  }, [expression]);

  const handleClear = useCallback(() => {
    setExpression('');
    setSession(null);
    setError(null);
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

  const handleApplyRule = useCallback(
    (option: RuleOption) => {
      setSession((prev) => {
        if (!prev) {
          return prev;
        }
        const base = prev.history.slice(0, prev.index + 1);
        base.push(createSnapshot(option.ast, option.rule, option.rationale));
        return {
          history: base,
          index: base.length - 1
        };
      });
      setError(null);
    },
    []
  );

  const handleUndo = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.index === 0) {
        return prev;
      }
      return {
        history: prev.history,
        index: prev.index - 1
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setSession((prev) => {
      if (!prev || prev.index >= prev.history.length - 1) {
        return prev;
      }
      return {
        history: prev.history,
        index: prev.index + 1
      };
    });
  }, []);

  const handleAutoComplete = useCallback(() => {
    setSession((prev) => {
      if (!prev) {
        return prev;
      }
      const base = prev.history.slice(0, prev.index + 1);
      let workingAst = base[base.length - 1]?.ast;
      if (!workingAst) {
        return prev;
      }
      while (true) {
        const [next] = listRuleApplications(workingAst);
        if (!next) {
          break;
        }
        workingAst = next.ast;
        base.push(createSnapshot(next.ast, next.rule, next.rationale));
      }
      return {
        history: base,
        index: base.length - 1
      };
    });
    setError(null);
  }, []);

  const canUndo = !!session && session.index > 0;
  const canRedo = !!session && session.index < session.history.length - 1;
  const canAuto = !!session && ruleOptions.length > 0;

  if (!enabled) {
    return null;
  }

  const steps = session ? session.history.slice(1) : [];
  const stepBadge = session
    ? session.index === 0
      ? 'Original expression'
      : `Step ${session.index} of ${session.history.length - 1}`
    : null;

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
              setSession(null);
              setError(null);
            }}
          >
            {item}
          </button>
        ))}
      </aside>
      <div className={styles.mainColumn} data-testid="dev-step-stack">
        <div className={styles.displayPanel} data-testid="display-panel">
          <ExpressionDisplay value={displayExpression} aria-label="Rendered expression" />
          <div className={styles.displayMeta}>
            {stepBadge ? <span className={styles.badge}>{stepBadge}</span> : <span className={styles.hint}>Enter an expression and press Apply.</span>}
            {normalizedValue ? (
              <span className={styles.valueBadge}>Normalized value: {normalizedValue}</span>
            ) : evaluationError ? (
              <span className={styles.errorMessage}>Unable to normalize: {evaluationError}</span>
            ) : null}
          </div>
        </div>
        {session ? (
          <div className={styles.workspace} data-testid="workspace-panel">
            <section className={styles.ruleColumn} aria-label="Rule options">
              <div className={styles.panelHeader}>Rule options</div>
              <div className={styles.controlsRow}>
                <button
                  type="button"
                  className={styles.controlButton}
                  onClick={handleUndo}
                  disabled={!canUndo}
                  data-testid="undo-button"
                >
                  Undo
                </button>
                <button
                  type="button"
                  className={styles.controlButton}
                  onClick={handleRedo}
                  disabled={!canRedo}
                  data-testid="redo-button"
                >
                  Redo
                </button>
                <button
                  type="button"
                  className={styles.controlButton}
                  onClick={handleAutoComplete}
                  disabled={!canAuto}
                  data-testid="auto-button"
                >
                  Auto-run
                </button>
              </div>
              <div className={styles.rulePanel} data-testid="rules-panel">
                {ruleOptions.length > 0 ? (
                  <ul className={styles.ruleList}>
                    {ruleOptions.map((option, index) => (
                      <li key={`${option.rule}-${index}`} className={styles.ruleCard}>
                        <div className={styles.ruleHeader}>
                          <span className={styles.ruleName}>{option.rule}</span>
                          <button
                            type="button"
                            className={styles.ruleApplyButton}
                            onClick={() => handleApplyRule(option)}
                          >
                            Apply
                          </button>
                        </div>
                        <div className={styles.rulePreview}>{option.preview}</div>
                        {option.rationale.length > 0 && (
                          <ul className={styles.ruleRationale}>
                            {option.rationale.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.emptyState}>No further rules apply.</div>
                )}
              </div>
            </section>
            <section className={styles.traceColumn} data-testid="result-panel">
              <div className={styles.panelHeader}>Trace</div>
              <ol className={styles.traceList}>
                {steps.length === 0 ? (
                  <li className={styles.emptyState}>No steps applied yet.</li>
                ) : (
                  steps.map((step, index) => (
                    <li key={`${step.rule ?? 'start'}-${index}`} className={styles.traceItem}>
                      <div className={styles.traceHeading}>
                        <span className={styles.traceIndex}>Step {index + 1}</span>
                        <span className={styles.traceRule}>{step.rule}</span>
                      </div>
                      <div className={styles.traceExpression}>{step.expression}</div>
                      {step.rationale.length > 0 && (
                        <ul className={styles.reasonList}>
                          {step.rationale.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))
                )}
              </ol>
              <div className={styles.finalSummary}>
                <div className={styles.resultTitle}>Current expression</div>
                <div className={styles.resultExpression}>{currentSnapshot?.expression}</div>
                {normalizedValue ? (
                  <div className={styles.finalValue}>Normalized value: {normalizedValue}</div>
                ) : evaluationError ? (
                  <div className={styles.errorMessage}>Unable to normalize: {evaluationError}</div>
                ) : null}
              </div>
            </section>
          </div>
        ) : error ? (
          <div className={styles.resultPanel} data-testid="result-panel">
            <div className={styles.resultTitle}>Unable to compute</div>
            <div className={styles.errorMessage}>{error}</div>
          </div>
        ) : null}
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
