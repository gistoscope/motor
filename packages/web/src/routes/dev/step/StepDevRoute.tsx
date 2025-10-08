import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyNextRule,
  evaluateExpression,
  formatRational,
  formatStage2,
  parseStage2Expression
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

type PairMap = Map<string, string>;

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

function wrapContent(content: React.ReactNode, path: string, pairMap: PairMap): React.ReactNode {
  const wrapBase = `${path}.wrap`;
  const openId = `${wrapBase}.open`;
  const closeId = `${wrapBase}.close`;
  pairMap.set(openId, closeId);
  pairMap.set(closeId, openId);
  return (
    <span className={styles.group} data-ast-id={`${wrapBase}.group`}>
      <span className={styles.paren} data-ast-id={openId} data-ast-role="paren-open">
        (
      </span>
      <span className={styles.groupInner} data-ast-id={`${wrapBase}.inner`}>
        {content}
      </span>
      <span className={styles.paren} data-ast-id={closeId} data-ast-role="paren-close">
        )
      </span>
    </span>
  );
}

function renderNode(node: DisplayNode, path: string, pairMap: PairMap): React.ReactNode {
  if (node.kind === 'literal') {
    const literal = (
      <span className={styles.literal} data-ast-id={`${path}.literal`}>
        {node.value}
      </span>
    );
    return node.wrap ? wrapContent(literal, path, pairMap) : literal;
  }

  if (node.kind === 'fraction') {
    const fraction = (
      <span className={styles.fraction} data-ast-id={`${path}.fraction`}>
        <span className={styles.fracPart} data-ast-id={`${path}.numerator.part`}>
          {renderNode(node.numerator, `${path}.numerator`, pairMap)}
        </span>
        <span className={styles.fracBar} data-ast-id={`${path}.bar`} />
        <span className={styles.fracPart} data-ast-id={`${path}.denominator.part`}>
          {renderNode(node.denominator, `${path}.denominator`, pairMap)}
        </span>
      </span>
    );
    return node.wrap ? wrapContent(fraction, path, pairMap) : fraction;
  }

  const operation = (
    <span className={styles.operation} data-ast-id={`${path}.operation`}>
      {renderNode(node.left, `${path}.left`, pairMap)}
      <span className={styles.operatorSymbol} data-ast-id={`${path}.operator`}>
        {node.operator}
      </span>
      {renderNode(node.right, `${path}.right`, pairMap)}
    </span>
  );
  return node.wrap ? wrapContent(operation, path, pairMap) : operation;
}

type ExpressionDisplayProps = {
  value: string;
  'aria-label': string;
  onPairMapChange?: (pairMap: PairMap) => void;
};

function ExpressionDisplay({ value, onPairMapChange, ...rest }: ExpressionDisplayProps) {
  const { rendered, pairMap } = useMemo(() => {
    const parsed = parseExpression(value);
    const map: PairMap = new Map();
    const node = renderNode(parsed, 'root', map);
    return { rendered: node, pairMap: map };
  }, [value]);

  useEffect(() => {
    onPairMapChange?.(pairMap);
  }, [onPairMapChange, pairMap]);

  return (
    <div {...rest} className={styles.katexWrap}>
      {rendered}
    </div>
  );
}

type AttachOptions = {
  getPairMap?: () => PairMap | null;
};

type AttachHandle = {
  detach(): void;
};

function attachTIL(
  container: HTMLElement,
  getAst: () => AST | null,
  options?: AttachOptions
): AttachHandle {
  void getAst();
  const hoverClass = 't-hover';
  const selectedClass = 't-selected';
  let hovered: HTMLElement[] = [];
  let selectedIds = new Set<string>();

  const getIdsForToken = (id: string | null): string[] => {
    if (!id) {
      return [];
    }
    const pairMap = options?.getPairMap?.() ?? null;
    if (!pairMap) {
      return [id];
    }
    const ids = new Set<string>([id]);
    const counterpart = pairMap.get(id);
    if (counterpart) {
      ids.add(counterpart);
    }
    return Array.from(ids);
  };

  const queryElements = (ids: string[]): HTMLElement[] => {
    const elements: HTMLElement[] = [];
    ids.forEach((tokenId) => {
      const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(tokenId) : tokenId;
      container
        .querySelectorAll<HTMLElement>(`[data-ast-id="${escaped}"]`)
        .forEach((element) => {
          elements.push(element);
        });
    });
    return elements;
  };

  const applyHover = (ids: string[]) => {
    hovered.forEach((element) => {
      element.classList.remove(hoverClass);
    });
    const next = queryElements(ids);
    next.forEach((element) => {
      element.classList.add(hoverClass);
    });
    hovered = next;
  };

  const syncSelection = () => {
    container.querySelectorAll<HTMLElement>('[data-ast-id]').forEach((element) => {
      const id = element.getAttribute('data-ast-id');
      if (!id) {
        return;
      }
      if (selectedIds.has(id)) {
        element.classList.add(selectedClass);
      } else {
        element.classList.remove(selectedClass);
      }
    });
  };

  const toggleSelection = (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }
    const shouldDeselect = ids.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    ids.forEach((id) => {
      if (shouldDeselect) {
        next.delete(id);
      } else {
        next.add(id);
      }
    });
    selectedIds = next;
    syncSelection();
  };

  const handlePointerOver = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const token = target.closest<HTMLElement>('[data-ast-id]');
    if (!token || !container.contains(token)) {
      applyHover([]);
      return;
    }
    const id = token.getAttribute('data-ast-id');
    if (!id) {
      applyHover([]);
      return;
    }
    applyHover(getIdsForToken(id));
  };

  const handlePointerOut = (event: PointerEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && container.contains(nextTarget)) {
      return;
    }
    applyHover([]);
  };

  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const token = target.closest<HTMLElement>('[data-ast-id]');
    if (!token || !container.contains(token)) {
      return;
    }
    event.preventDefault();
    const id = token.getAttribute('data-ast-id');
    if (!id) {
      return;
    }
    toggleSelection(getIdsForToken(id));
  };

  container.addEventListener('pointerover', handlePointerOver);
  container.addEventListener('pointerout', handlePointerOut);
  container.addEventListener('click', handleClick);

  return {
    detach() {
      hovered.forEach((element) => {
        element.classList.remove(hoverClass);
      });
      hovered = [];
      selectedIds = new Set();
      container.removeEventListener('pointerover', handlePointerOver);
      container.removeEventListener('pointerout', handlePointerOut);
      container.removeEventListener('click', handleClick);
      syncSelection();
    }
  };
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

export default function StepDevRoute() {
  const [expression, setExpression] = useState<string>(EXAMPLES[0]);
  const [outcome, setOutcome] = useState<StepOutcome>({ kind: 'idle' });

  const enabled = isDevRouteEnabled();

  const displayContainerRef = useRef<HTMLDivElement | null>(null);
  const pairMapRef = useRef<PairMap>(new Map());
  const astRef = useRef<AST | null>(null);

  const ast = useMemo(() => {
    try {
      return parseStage2Expression(expression);
    } catch {
      return null;
    }
  }, [expression]);

  astRef.current = ast;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const styleId = 'til-highlight-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [data-ast-id].t-hover { background-color: rgba(180, 213, 255, 0.6); }
      [data-ast-id].t-selected { background-color: rgba(99, 102, 241, 0.35); }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  useEffect(() => {
    const container = displayContainerRef.current;
    if (!container || typeof window === 'undefined') {
      return;
    }
    const handle = attachTIL(container, () => astRef.current, {
      getPairMap: () => pairMapRef.current
    });
    return () => {
      handle.detach();
    };
  }, [expression]);

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
        <div
          className={styles.displayPanel}
          data-testid="display-panel"
          ref={displayContainerRef}
        >
          <ExpressionDisplay
            value={expression}
            aria-label="Rendered expression"
            onPairMapChange={(map) => {
              pairMapRef.current = map;
            }}
          />
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
