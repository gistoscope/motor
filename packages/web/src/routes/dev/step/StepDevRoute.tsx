import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './StepDevRoute.module.css';

// TSA formatting helpers if present:
import type { AST as StageAst } from '@motor/tsa';
import * as tsaModule from '@motor/tsa';
let tsa: any = tsaModule;
try {
  const maybeRequire = (globalThis as { require?: (id: string) => any }).require;
  if (typeof maybeRequire === 'function') {
    tsa = maybeRequire('@motor/tsa');
  }
} catch {
  tsa = tsaModule;
}

import { wireExecuteShortcuts } from '../../../til/shortcuts';
import { wireAltClickExpand } from '../../../til/events.expand';
import { makeExecutor } from '../../../til/executor';
import { validateExpression } from '../../../til/validate';
import type { Validation } from '../../../til/validate';
import type { AST, NodeId } from '../../../til/opTokens';
import { listActions, canApply, applyOne, RULE_MAP } from '../../../til/tsaAdapter';
import '../../../til/highlight.no-select.css';
import '../../../til/highlight.css';

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
  | { kind: 'literal'; value: string }
  | { kind: 'fraction'; numerator: DisplayNode; denominator: DisplayNode }
  | {
      kind: 'operation';
      operator: '×' | '÷' | '+' | '-';
      left: DisplayNode;
      right: DisplayNode;
    }
  | { kind: 'group'; inner: DisplayNode };

type PairMap = Map<string, string>;

type SyntheticAst = {
  linear: NodeId[];
  tokens: Record<NodeId, { text: string }>;
  owner: Record<NodeId, NodeId>;
  byId: Record<NodeId, { type: string }>;
  nodes: Record<NodeId, { span: NodeId[]; type: string }>;
  pairs: Record<NodeId, [NodeId, NodeId]>;
  parent: Record<NodeId, NodeId | null>;
};

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
    return { kind: 'literal', value: '' };
  }

  if (hasOuterParentheses(trimmed)) {
    return { kind: 'group', inner: parseExpression(trimmed.slice(1, -1)) };
  }

  const addIndex = findTopLevelOperator(trimmed, ['+', '-']);
  if (addIndex > 0) {
    const operator = trimmed[addIndex] as '+' | '-';
    return {
      kind: 'operation',
      operator,
      left: parseExpression(trimmed.slice(0, addIndex)),
      right: parseExpression(trimmed.slice(addIndex + 1))
    };
  }

  const opIndex = findTopLevelOperator(trimmed, ['×', '÷']);
  if (opIndex !== -1) {
    return {
      kind: 'operation',
      operator: trimmed[opIndex] as '×' | '÷',
      left: parseExpression(trimmed.slice(0, opIndex)),
      right: parseExpression(trimmed.slice(opIndex + 1))
    };
  }

  const slashIndex = findTopLevelOperator(trimmed, ['/']);
  if (slashIndex !== -1) {
    return {
      kind: 'fraction',
      numerator: parseExpression(trimmed.slice(0, slashIndex)),
      denominator: parseExpression(trimmed.slice(slashIndex + 1))
    };
  }

  return { kind: 'literal', value: trimmed };
}

type BuildContext = {
  pairMap: PairMap;
  ast: SyntheticAst;
};

function createBuildContext(): BuildContext {
  return {
    pairMap: new Map<string, string>(),
    ast: {
      linear: [],
      tokens: {},
      owner: {},
      byId: {},
      nodes: {},
      pairs: {},
      parent: {}
    }
  };
}

function registerToken(
  context: BuildContext,
  id: NodeId,
  text: string,
  ownerId: NodeId | null,
  parentId: NodeId | null
): void {
  context.ast.linear.push(id);
  context.ast.tokens[id] = { text };
  if (ownerId) {
    context.ast.owner[id] = ownerId;
  }
  context.ast.parent[id] = parentId ?? ownerId ?? null;
}

function finalizeNode(
  context: BuildContext,
  nodeId: NodeId,
  type: string,
  startIndex: number,
  parentId: NodeId | null
): void {
  const span = context.ast.linear.slice(startIndex);
  context.ast.nodes[nodeId] = { span: span.slice(), type };
  context.ast.byId[nodeId] = { type };
  context.ast.owner[nodeId] = nodeId;
  context.ast.parent[nodeId] = parentId ?? null;
}

function renderNode(
  node: DisplayNode,
  path: string,
  context: BuildContext,
  ownerId: NodeId | null,
  parentId: NodeId | null
): React.ReactNode {
  if (node.kind === 'group') {
    const wrapBase = `${path}.wrap`;
    const groupId = `${wrapBase}.group`;
    const openId = `${wrapBase}.open`;
    const closeId = `${wrapBase}.close`;
    const innerId = `${wrapBase}.inner`;

    const start = context.ast.linear.length;

    context.pairMap.set(openId, closeId);
    context.pairMap.set(closeId, openId);
    context.ast.pairs[openId] = [openId, closeId];
    context.ast.pairs[closeId] = [openId, closeId];

    registerToken(context, openId, '(', groupId, groupId);
    context.ast.owner[groupId] = groupId;
    context.ast.parent[groupId] = parentId ?? null;
    context.ast.owner[innerId] = groupId;
    context.ast.parent[innerId] = groupId;

    const inner = renderNode(node.inner, `${path}.inner`, context, groupId, groupId);

    registerToken(context, closeId, ')', groupId, groupId);
    finalizeNode(context, groupId, 'Paren', start, parentId);

    return (
      <span className={styles.group} data-ast-id={groupId}>
        <span className={styles.paren} data-ast-id={openId} data-ast-role="paren-open">
          (
        </span>
        <span className={styles.groupInner} data-ast-id={innerId}>
          {inner}
        </span>
        <span className={styles.paren} data-ast-id={closeId} data-ast-role="paren-close">
          )
        </span>
      </span>
    );
  }

  if (node.kind === 'literal') {
    const id = `${path}.literal`;
    registerToken(context, id, node.value, ownerId, parentId);
    return (
      <span className={styles.literal} data-ast-id={id}>
        {node.value}
      </span>
    );
  }

  if (node.kind === 'fraction') {
    const nodeId = `${path}.fraction`;
    const start = context.ast.linear.length;

    context.ast.owner[nodeId] = nodeId;
    context.ast.parent[nodeId] = parentId ?? null;

    const numeratorPartId = `${path}.numerator.part`;
    const denominatorPartId = `${path}.denominator.part`;
    context.ast.owner[numeratorPartId] = nodeId;
    context.ast.owner[denominatorPartId] = nodeId;
    context.ast.parent[numeratorPartId] = nodeId;
    context.ast.parent[denominatorPartId] = nodeId;

    const childOwner = ownerId ?? nodeId;
    const numerator = renderNode(node.numerator, `${path}.numerator`, context, childOwner, nodeId);
    const barId = `${path}.bar`;
    registerToken(context, barId, '/', ownerId ?? nodeId, nodeId);
    const denominator = renderNode(node.denominator, `${path}.denominator`, context, childOwner, nodeId);

    finalizeNode(context, nodeId, 'Fraction', start, parentId);

    return (
      <span className={styles.fraction} data-ast-id={nodeId}>
        <span className={styles.fracPart} data-ast-id={numeratorPartId}>
          {numerator}
        </span>
        <span className={styles.fracBar} data-ast-id={barId} />
        <span className={styles.fracPart} data-ast-id={denominatorPartId}>
          {denominator}
        </span>
      </span>
    );
  }

  const nodeId = `${path}.operation`;
  const start = context.ast.linear.length;

  context.ast.owner[nodeId] = nodeId;
  context.ast.parent[nodeId] = parentId ?? null;

  const childOwner = ownerId ?? nodeId;
  const left = renderNode(node.left, `${path}.left`, context, childOwner, nodeId);
  const operatorId = `${path}.operator`;
  registerToken(context, operatorId, node.operator, ownerId ?? nodeId, nodeId);
  const right = renderNode(node.right, `${path}.right`, context, childOwner, nodeId);

  finalizeNode(context, nodeId, 'Operation', start, parentId);

  return (
    <span className={styles.operation} data-ast-id={nodeId}>
      {left}
      <span className={styles.operatorSymbol} data-ast-id={operatorId}>
        {node.operator}
      </span>
      {right}
    </span>
  );
}

type ExpressionDisplayProps = {
  value: string;
  'aria-label': string;
  onPairMapChange?: (pairMap: PairMap) => void;
  onAstChange?: (ast: SyntheticAst) => void;
};

function ExpressionDisplay({ value, onPairMapChange, onAstChange, ...rest }: ExpressionDisplayProps) {
  const { rendered, pairMap, ast } = useMemo(() => {
    try {
      const parsed = parseExpression(value);
      const context = createBuildContext();
      const element = renderNode(parsed, 'root', context, null, null);
      return { rendered: element, pairMap: context.pairMap, ast: context.ast };
    } catch {
      const context = createBuildContext();
      return { rendered: <span data-ast-id="root.empty" />, pairMap: context.pairMap, ast: context.ast };
    }
  }, [value]);

  useEffect(() => {
    onPairMapChange?.(pairMap);
  }, [onPairMapChange, pairMap]);

  useEffect(() => {
    onAstChange?.(ast);
  }, [onAstChange, ast]);

  return (
    <div {...rest} className={styles.katexWrap}>
      {rendered}
    </div>
  );
}

function escapeAstId(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(id);
  }
  return id.replace(/"/g, '\\"');
}

function computeDragSpan(ast: SyntheticAst, startId: NodeId, endId: NodeId): NodeId[] {
  if (startId === endId) {
    const span = ast.nodes[startId]?.span;
    if (span?.length) {
      return span.slice();
    }
    return [startId];
  }

  const getAncestors = (seed: NodeId): NodeId[] => {
    const list: NodeId[] = [];
    const seen = new Set<NodeId>();
    let current: NodeId | null = seed;
    while (current && !seen.has(current)) {
      list.push(current);
      seen.add(current);
      const parent: NodeId | null = ast.parent[current] ?? null;
      if (parent === current) {
        break;
      }
      current = parent;
    }
    return list;
  };

  const startAnc = new Set(getAncestors(startId));
  const endAncestors = getAncestors(endId);
  let lca: NodeId | null = null;
  for (const candidate of endAncestors) {
    if (startAnc.has(candidate)) {
      lca = candidate;
      break;
    }
  }

  if (lca) {
    const lcaSpan = ast.nodes[lca]?.span;
    if (lcaSpan?.length) {
      return lcaSpan.slice();
    }
    if (ast.tokens[lca]) {
      return [lca];
    }
  }

  const startSpan = ast.nodes[startId]?.span ?? [startId];
  const endSpan = ast.nodes[endId]?.span ?? [endId];
  const startToken = startSpan[0];
  const endToken = endSpan[endSpan.length - 1];
  const order = ast.linear ?? [];
  const a = order.indexOf(startToken);
  const b = order.indexOf(endToken);
  if (a < 0 || b < 0) {
    return [];
  }
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  return order.slice(from, to + 1);
}

function wireDragSelectLCA(
  root: HTMLElement,
  api: {
    getAst(): SyntheticAst;
    getSelection(): NodeId[];
    setSelection(ids: NodeId[]): void;
  }
): () => void {
  let startId: NodeId | null = null;
  let pointerId: number | null = null;
  let captured: HTMLElement | null = null;

  const getIdFromEvent = (event: Event): NodeId | null => {
    const element = (event.target as Element | null)?.closest('[data-ast-id]') as HTMLElement | null;
    if (!element) {
      return null;
    }
    return (element.getAttribute('data-ast-id') ?? null) as NodeId | null;
  };

  const clear = () => {
    if (pointerId !== null && captured && typeof captured.releasePointerCapture === 'function') {
      try {
        captured.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    startId = null;
    pointerId = null;
    captured = null;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    const id = getIdFromEvent(event);
    if (!id) {
      return;
    }
    startId = id;
    pointerId = event.pointerId;
    captured = (event.target as HTMLElement | null)?.closest('[data-ast-id]') as HTMLElement | null;
    captured?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (pointerId !== null && event.pointerId !== pointerId) {
      return;
    }
    const endId = getIdFromEvent(event);
    if (startId && endId) {
      const ast = api.getAst();
      const span = computeDragSpan(ast, startId, endId);
      if (span.length > 0) {
        api.setSelection(span);
      }
    }
    clear();
  };

  const handlePointerCancel = () => {
    clear();
  };

  root.addEventListener('pointerdown', handlePointerDown);
  root.addEventListener('pointerup', handlePointerUp);
  root.addEventListener('pointercancel', handlePointerCancel);

  return () => {
    root.removeEventListener('pointerdown', handlePointerDown);
    root.removeEventListener('pointerup', handlePointerUp);
    root.removeEventListener('pointercancel', handlePointerCancel);
  };
}

function applyTrace(ast: StageAst): { steps: TraceStep[]; finalExpression: string; finalValue: string } | { error: string } {
  const applyNext = typeof tsa.applyNextRule === 'function' ? tsa.applyNextRule : null;
  const formatStage = typeof tsa.formatStage2 === 'function' ? tsa.formatStage2 : null;
  const evaluate = typeof tsa.evaluateExpression === 'function' ? tsa.evaluateExpression : null;
  const formatValue = typeof tsa.formatRational === 'function' ? tsa.formatRational : null;

  if (!applyNext || !formatStage || !evaluate || !formatValue) {
    return { error: 'Tracing unavailable: TSA helpers missing.' };
  }

  const steps: TraceStep[] = [];
  let current: StageAst = ast;

  while (true) {
    const result = applyNext(current);
    if (!result) {
      break;
    }
    current = result.ast;
    steps.push({
      rule: result.rule,
      rationale: result.rationale,
      expression: formatStage(current)
    });
  }

  const evaluated = evaluate(current);
  if ('error' in evaluated) {
    return { error: evaluated.error };
  }

  return {
    steps,
    finalExpression: formatStage(current),
    finalValue: formatValue(evaluated)
  };
}

export function evaluateTrace(expression: string): StepOutcome {
  const parse = typeof tsa.parseStage2Expression === 'function' ? tsa.parseStage2Expression : null;
  const source = expression.trim();
  if (source === '') {
    return { kind: 'error', message: 'Expression is empty.' };
  }

  if (!parse) {
    return { kind: 'error', message: 'Parser unavailable.' };
  }

  try {
    const ast = parse(source);
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
  const initialExample = EXAMPLES[0];
  const [source, setSource] = useState<string>(initialExample);
  const [working, setWorking] = useState<string>(initialExample);
  const [outcome, setOutcome] = useState<StepOutcome>({ kind: 'idle' });
  const [validation, setValidation] = useState<Validation>({ ok: true });
  const isValid = validation.ok;
  const invalidReason = validation.ok ? null : validation.reason;

  const enabled = isDevRouteEnabled();

  const displayContainerRef = useRef<HTMLDivElement | null>(null);
  const pairMapRef = useRef<PairMap>(new Map());
  const astRef = useRef<SyntheticAst>({
    linear: [],
    tokens: {},
    owner: {},
    byId: {},
    nodes: {},
    pairs: {},
    parent: {}
  });
  const stageAstRef = useRef<StageAst | null>(null);
  const selectionRef = useRef<NodeId[]>([]);
  const hoveredElementsRef = useRef<HTMLElement[]>([]);
  const selectedElementsRef = useRef<HTMLElement[]>([]);

  const getIdsForToken = useCallback((id: NodeId | null): NodeId[] => {
    if (!id) {
      return [];
    }
    const pairMap = pairMapRef.current;
    const ids = new Set<NodeId>([id]);
    const counterpart = pairMap.get(id);
    if (counterpart) {
      ids.add(counterpart);
    }
    return Array.from(ids);
  }, []);

  const applyHover = useCallback((ids: NodeId[]) => {
    const root = displayContainerRef.current;
    if (!root) {
      return;
    }
    hoveredElementsRef.current.forEach((element) => {
      element.classList.remove('t-hover');
    });
    const next: HTMLElement[] = [];
    ids.forEach((tokenId) => {
      const escaped = escapeAstId(tokenId);
      root.querySelectorAll<HTMLElement>(`[data-ast-id="${escaped}"]`).forEach((element) => {
        element.classList.add('t-hover');
        next.push(element);
      });
    });
    hoveredElementsRef.current = next;
  }, []);

  const setSelection = useCallback((ids: NodeId[]) => {
    const unique = Array.isArray(ids) ? Array.from(new Set(ids)) : [];
    selectionRef.current = unique;

    const root = displayContainerRef.current;
    if (!root) {
      selectedElementsRef.current = [];
      return;
    }
    selectedElementsRef.current.forEach((element) => {
      element.classList.remove('t-selected');
    });
    const next: HTMLElement[] = [];
    unique.forEach((tokenId) => {
      const escaped = escapeAstId(tokenId);
      root.querySelectorAll<HTMLElement>(`[data-ast-id="${escaped}"]`).forEach((element) => {
        element.classList.add('t-selected');
        next.push(element);
      });
    });
    selectedElementsRef.current = next;
    root.setAttribute('data-selection-size', String(unique.length));
  }, []);

  const clearSelection = useCallback(() => {
    selectionRef.current = [];
    const root = displayContainerRef.current;
    if (!root) {
      selectedElementsRef.current = [];
      return;
    }
    selectedElementsRef.current.forEach((element) => {
      element.classList.remove('t-selected');
    });
    selectedElementsRef.current = [];
    root.setAttribute('data-selection-size', '0');
  }, []);

  const emptyAst = useMemo<SyntheticAst>(() => ({
    linear: [],
    tokens: {},
    owner: {},
    byId: {},
    nodes: {},
    pairs: {},
    parent: {}
  }), []);

  const getSyntheticAst = useCallback((): SyntheticAst => {
    return astRef.current ?? emptyAst;
  }, [emptyAst]);

  const getAstForEvents = useCallback((): AST => {
    return (astRef.current ?? emptyAst) as unknown as AST;
  }, [emptyAst]);

  const getSelection = useCallback((): NodeId[] => {
    return [...selectionRef.current];
  }, []);

  useEffect(() => {
    if (typeof tsa.parseStage2Expression === 'function') {
      try {
        stageAstRef.current = tsa.parseStage2Expression(working);
      } catch {
        stageAstRef.current = null;
      }
    } else {
      stageAstRef.current = null;
    }
  }, [working]);

  const exec = useMemo(() => {
    const executor = makeExecutor(getAstForEvents, {
      listActions: (focus) => {
        const stageAst = stageAstRef.current;
        if (!stageAst) {
          return [];
        }
        return listActions(stageAst, focus);
      },
      canApply: (rule, focus) => {
        const stageAst = stageAstRef.current;
        if (!stageAst) {
          return false;
        }
        return canApply(stageAst, rule, focus);
      },
      onExecute: ({ rule, focus }) => {
        const stageAst = stageAstRef.current;
        if (!stageAst) {
          return;
        }
        const result = applyOne(stageAst, rule, focus);
        if (result.ok) {
          stageAstRef.current = result.ast;
          setWorking((prev) => {
            if (typeof tsa.formatStage2 === 'function') {
              try {
                return tsa.formatStage2(result.ast);
              } catch {
                return prev;
              }
            }
            return prev;
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn('[TIL] applyOne failed:', result.reason);
        }
      },
      opRuleMap: RULE_MAP
    });
    return (focus: NodeId[]) => executor(focus);
  }, [getAstForEvents, setWorking]);

  useEffect(() => {
    const root = displayContainerRef.current;
    if (!root) {
      return;
    }

    if (!root.hasAttribute('tabindex')) {
      root.setAttribute('tabindex', '0');
    }

    if (!isValid) {
      applyHover([]);
      clearSelection();
      return;
    }

    setTimeout(() => {
      try {
        root.focus();
      } catch {
        // ignore
      }
    }, 0);

    const handlePointerOver = (event: PointerEvent) => {
      const token = (event.target as HTMLElement | null)?.closest('[data-ast-id]') as HTMLElement | null;
      if (!token || !root.contains(token)) {
        applyHover([]);
        return;
      }
      const id = (token.getAttribute('data-ast-id') ?? null) as NodeId | null;
      applyHover(getIdsForToken(id));
    };

    const handlePointerOut = (event: PointerEvent) => {
      const nextTarget = event.relatedTarget as HTMLElement | null;
      if (nextTarget && root.contains(nextTarget)) {
        return;
      }
      applyHover([]);
    };

    root.addEventListener('pointerover', handlePointerOver);
    root.addEventListener('pointerout', handlePointerOut);

    const unShortcuts = wireExecuteShortcuts(root, {
      getAst: getAstForEvents,
      getSelection,
      setSelection,
      exec
    });
    const unAlt = wireAltClickExpand(root, {
      getAst: getAstForEvents,
      getSelection,
      setSelection
    });
    const unDrag = wireDragSelectLCA(root, {
      getAst: getSyntheticAst,
      getSelection,
      setSelection
    });

    return () => {
      applyHover([]);
      setSelection(selectionRef.current);
      root.removeEventListener('pointerover', handlePointerOver);
      root.removeEventListener('pointerout', handlePointerOut);
      unShortcuts?.();
      unAlt?.();
      unDrag?.();
    };
  }, [
    applyHover,
    clearSelection,
    getAstForEvents,
    getIdsForToken,
    getSelection,
    getSyntheticAst,
    setSelection,
    exec,
    isValid
  ]);

  useEffect(() => {
    setSelection(selectionRef.current);
  }, [working, setSelection]);

  const handleApply = useCallback(() => {
    setOutcome(evaluateTrace(working));
  }, [working]);

  const handleClear = useCallback(() => {
    setSource('');
    setWorking('');
    setValidation({ ok: true });
    clearSelection();
    setOutcome({ kind: 'idle' });
  }, [clearSelection]);

  const handleLoadWorking = useCallback(() => {
    const result = validateExpression(source);
    setValidation(result);
    if (!result.ok) {
      return;
    }
    clearSelection();
    setWorking(source);
  }, [clearSelection, source]);

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
              setSource(item);
              setWorking(item);
              setValidation({ ok: true });
              clearSelection();
              setOutcome({ kind: 'idle' });
            }}
          >
            {item}
          </button>
        ))}
      </aside>
      <div className={styles.mainColumn} data-testid="dev-step-stack">
        <div
          className={`${styles.displayPanel} til-no-select`}
          data-testid="display-panel"
          ref={displayContainerRef}
        >
          <ExpressionDisplay
            value={working}
            aria-label="Rendered expression"
            onPairMapChange={(map) => {
              pairMapRef.current = map;
            }}
            onAstChange={(synthetic) => {
              astRef.current = synthetic;
            }}
          />
        </div>
        {!isValid && invalidReason && (
          <div className={styles.invalidBanner} role="alert" data-testid="invalid-banner">
            Invalid expression: {invalidReason}
          </div>
        )}
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
            value={source}
            onChange={(event) => setSource(event.target.value)}
            onKeyDown={handleTextareaKey}
            style={{ resize: 'vertical' }}
          />
          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleLoadWorking}
              data-testid="load-working-button"
            >
              Load Working
            </button>
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
