import type { AST, NodeId } from './opTokens';
import { getTokenText } from './opTokens';

type Rational = { n: bigint; d: bigint };

type MicroResult = { ok: true; expr: string } | { ok: false; reason?: string };

const ADDITIVE = new Set(['+']);
const MULTIPLICATIVE = new Set(['*', '×']);
const DIVISIVE = new Set(['/', '÷']);
const SUBTRACTIVE = new Set(['-']);

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function normalizeRational(input: Rational): Rational {
  if (input.d === 0n) {
    throw new Error('Invalid rational: zero denominator');
  }
  let { n, d } = input;
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

function parseDigits(value: string): bigint | null {
  if (!/^[-+]?[0-9]+$/.test(value)) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function stripOuterParens(value: string): string {
  let result = value.trim();
  while (result.startsWith('(') && result.endsWith(')')) {
    let depth = 0;
    let balanced = true;
    for (let index = 0; index < result.length; index += 1) {
      const ch = result[index];
      if (ch === '(') {
        depth += 1;
      } else if (ch === ')') {
        depth -= 1;
        if (depth < 0) {
          balanced = false;
          break;
        }
        if (depth === 0 && index !== result.length - 1) {
          balanced = false;
          break;
        }
      }
    }
    if (!balanced || depth !== 0) {
      break;
    }
    result = result.slice(1, -1).trim();
  }
  return result;
}

function parseRational(text: string): Rational | null {
  const compact = stripOuterParens(text.replace(/\s+/g, ''));
  if (compact === '') {
    return null;
  }
  const slashIndex = compact.indexOf('/');
  if (slashIndex === -1) {
    const digits = parseDigits(compact);
    if (digits === null) {
      return null;
    }
    return { n: digits, d: 1n };
  }
  if (compact.indexOf('/', slashIndex + 1) !== -1) {
    return null;
  }
  const left = compact.slice(0, slashIndex);
  const right = compact.slice(slashIndex + 1);
  const num = parseDigits(left);
  const den = parseDigits(right);
  if (num === null || den === null || den === 0n) {
    return null;
  }
  return normalizeRational({ n: num, d: den });
}

function formatRational(value: Rational): string {
  const normalized = normalizeRational(value);
  if (normalized.d === 1n) {
    return normalized.n.toString();
  }
  return `${normalized.n.toString()}/${normalized.d.toString()}`;
}

function addRational(a: Rational, b: Rational): Rational {
  return normalizeRational({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}

function subRational(a: Rational, b: Rational): Rational {
  return normalizeRational({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}

function mulRational(a: Rational, b: Rational): Rational {
  return normalizeRational({ n: a.n * b.n, d: a.d * b.d });
}

function divRational(a: Rational, b: Rational): Rational {
  if (b.n === 0n) {
    throw new Error('Division by zero');
  }
  return normalizeRational({ n: a.n * b.d, d: a.d * b.n });
}

function joinTokens(ast: AST, ids: NodeId[]): string {
  return ids.map((id) => getTokenText(ast, id)).join('');
}

function isArrayOfNodeIds(value: unknown): value is NodeId[] {
  return Array.isArray(value);
}

function isAtomicResult(value: string): boolean {
  return !/[+\-*×÷]/.test(value);
}

function findOwnerNode(ast: AST, opId: NodeId): { id: NodeId; type: string; span: NodeId[] } | null {
  const nodes = (ast as any)?.nodes;
  if (!nodes) {
    return null;
  }
  let fractionCandidate: { id: NodeId; type: string; span: NodeId[] } | null = null;
  for (const [nodeId, node] of Object.entries(nodes) as [NodeId, any][]) {
    const span: NodeId[] | undefined = node?.span;
    if (!isArrayOfNodeIds(span)) {
      continue;
    }
    if (!span.includes(opId)) {
      continue;
    }
    if (node?.type === 'Operation') {
      return { id: nodeId, type: 'Operation', span: span.slice() };
    }
    if (node?.type === 'Fraction' && !fractionCandidate) {
      fractionCandidate = { id: nodeId, type: 'Fraction', span: span.slice() };
    }
  }
  return fractionCandidate;
}

function extractOperands(ast: AST, span: NodeId[], operatorId: NodeId): { left: string; right: string } | null {
  const pivot = span.indexOf(operatorId);
  if (pivot <= 0 || pivot >= span.length - 1) {
    return null;
  }
  const leftTokens = span.slice(0, pivot);
  const rightTokens = span.slice(pivot + 1);
  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return null;
  }
  return { left: joinTokens(ast, leftTokens), right: joinTokens(ast, rightTokens) };
}

function replaceSpanWith(ast: AST, span: NodeId[], replacement: string): string | null {
  const linear = (ast as any)?.linear;
  if (!Array.isArray(linear) || span.length === 0) {
    return null;
  }
  const startToken = span[0];
  const endToken = span[span.length - 1];
  const startIndex = linear.indexOf(startToken);
  const endIndex = linear.indexOf(endToken);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return null;
  }

  let replaceStart = startIndex;
  let replaceEnd = endIndex;

  const prevId = linear[replaceStart - 1] as NodeId | undefined;
  const nextId = linear[replaceEnd + 1] as NodeId | undefined;
  const prevText = prevId ? getTokenText(ast, prevId) : null;
  const nextText = nextId ? getTokenText(ast, nextId) : null;
  const pairs = (ast as any)?.pairs;
  const wrapsWithParens =
    prevId &&
    nextId &&
    prevText === '(' &&
    nextText === ')' &&
    (!pairs || (Array.isArray(pairs[prevId]) && pairs[prevId][1] === nextId));

  if (wrapsWithParens && isAtomicResult(replacement)) {
    replaceStart -= 1;
    replaceEnd += 1;
  }

  const before = joinTokens(ast, linear.slice(0, replaceStart));
  const after = joinTokens(ast, linear.slice(replaceEnd + 1));
  return `${before}${replacement}${after}`;
}

function computeBinary(op: string, left: Rational, right: Rational): Rational | null {
  try {
    if (ADDITIVE.has(op)) {
      return addRational(left, right);
    }
    if (SUBTRACTIVE.has(op)) {
      return subRational(left, right);
    }
    if (MULTIPLICATIVE.has(op)) {
      return mulRational(left, right);
    }
    if (DIVISIVE.has(op)) {
      return divRational(left, right);
    }
  } catch {
    return null;
  }
  return null;
}

function findOperatorToken(ast: AST, focus: NodeId[]): NodeId | null {
  for (const id of focus) {
    const token = getTokenText(ast, id);
    if (token.length !== 1) {
      continue;
    }
    if (
      ADDITIVE.has(token) ||
      SUBTRACTIVE.has(token) ||
      MULTIPLICATIVE.has(token) ||
      DIVISIVE.has(token)
    ) {
      return id;
    }
  }
  return null;
}

export function microApplyOne(_expr: string, ast: AST, focus: NodeId[]): MicroResult {
  if (!Array.isArray(focus) || focus.length === 0) {
    return { ok: false };
  }
  try {
    const operatorId = findOperatorToken(ast, focus);
    if (!operatorId) {
      return { ok: false };
    }

    const owner = findOwnerNode(ast, operatorId);
    if (!owner) {
      return { ok: false };
    }

    const operands = extractOperands(ast, owner.span, operatorId);
    if (!operands) {
      return { ok: false };
    }

    const leftValue = parseRational(operands.left);
    const rightValue = parseRational(operands.right);
    if (!leftValue || !rightValue) {
      return { ok: false };
    }

    const operatorChar = getTokenText(ast, operatorId);
    if (owner.type === 'Fraction' && operatorChar !== '/' && operatorChar !== '÷') {
      return { ok: false };
    }

    const result = computeBinary(operatorChar, leftValue, rightValue);
    if (!result) {
      return { ok: false };
    }

    const replacement = formatRational(result);
    const updated = replaceSpanWith(ast, owner.span, replacement);
    if (!updated) {
      return { ok: false };
    }

    return { ok: true, expr: updated.replace(/\s+/g, '') };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'micro execute failed' };
  }
}
