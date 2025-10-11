import type { AST } from './types.js';

export type UnaryKind = 'UnaryMinus' | 'NotUnary';

const SIGN_SUFFIX = '::sign';
const MAG_SUFFIX = '::mag';

type TokenLike = {
  id: string;
  text: string | null;
  role: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractText(candidate: unknown): string | null {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === 'string') {
    return candidate;
  }

  if (!isRecord(candidate)) {
    return null;
  }

  const possibleKeys = ['text', 'value', 'lexeme', 'source'];
  for (const key of possibleKeys) {
    const value = candidate[key];
    if (typeof value === 'string') {
      return value;
    }
  }

  return null;
}

function extractRole(candidate: unknown): string | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const possibleKeys = ['role', 'kind', 'type'];
  for (const key of possibleKeys) {
    const value = candidate[key];
    if (typeof value === 'string') {
      return value;
    }
  }

  return null;
}

function readTokensFromObject(source: Record<string, unknown> | undefined): Map<string, TokenLike> {
  const result = new Map<string, TokenLike>();
  if (!source) {
    return result;
  }

  for (const [id, value] of Object.entries(source)) {
    const text = extractText(value);
    const role = extractRole(value);
    result.set(id, { id, text, role });
  }

  return result;
}

function readTokens(ast: AST): Map<string, TokenLike> {
  if (!isRecord(ast)) {
    return new Map();
  }

  const tokensField = ast['tokens'];
  if (Array.isArray(tokensField)) {
    const result = new Map<string, TokenLike>();
    for (const entry of tokensField) {
      if (!entry) {
        continue;
      }

      if (typeof entry === 'string') {
        result.set(entry, { id: entry, text: null, role: null });
        continue;
      }

      if (isRecord(entry)) {
        const id = typeof entry['id'] === 'string' ? entry['id'] : null;
        if (!id) {
          continue;
        }

        const text = extractText(entry);
        const role = extractRole(entry);
        result.set(id, { id, text, role });
      }
    }
    return result;
  }

  if (isRecord(tokensField)) {
    return readTokensFromObject(tokensField);
  }

  const nodesField = ast['nodes'];
  if (isRecord(nodesField)) {
    return readTokensFromObject(nodesField);
  }

  return new Map();
}

function readSequence(ast: AST, tokens: Map<string, TokenLike>): string[] {
  if (!isRecord(ast)) {
    return Array.from(tokens.keys());
  }

  const candidates = ['sequence', 'order', 'tokenOrder', 'ids'];
  for (const key of candidates) {
    const field = ast[key];
    if (Array.isArray(field)) {
      const filtered = field.filter((value): value is string => typeof value === 'string');
      if (filtered.length > 0) {
        return filtered;
      }
    }
  }

  if (Array.isArray(ast['tokens'])) {
    const order: string[] = [];
    for (const entry of ast['tokens'] as unknown[]) {
      if (typeof entry === 'string') {
        order.push(entry);
      } else if (isRecord(entry) && typeof entry['id'] === 'string') {
        order.push(entry['id']);
      }
    }
    if (order.length > 0) {
      return order;
    }
  }

  return Array.from(tokens.keys());
}

function isOperatorCharacter(char: string): boolean {
  return ['+', '-', '×', '÷', '*', '/', '^', '∧', '∨', '='].includes(char);
}

function isOpeningDelimiter(char: string): boolean {
  return ['(', '{', '['].includes(char);
}

function getPreviousToken(sequence: string[], index: number, tokens: Map<string, TokenLike>): TokenLike | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidateId = sequence[cursor];
    if (!candidateId) {
      continue;
    }
    const candidate = tokens.get(candidateId);
    if (!candidate) {
      continue;
    }
    const text = candidate.text?.trim();
    if (!text) {
      continue;
    }
    return candidate;
  }

  return null;
}

function isOperatorRole(role: string | null): boolean {
  if (!role) {
    return false;
  }
  return role.toLowerCase().includes('operator');
}

export function classifyMinus(ast: AST, hostId: string): UnaryKind {
  const tokens = readTokens(ast);
  const sequence = readSequence(ast, tokens);
  const token = tokens.get(hostId);

  if (!token) {
    return 'NotUnary';
  }

  const text = token.text?.trim() ?? '';
  if (!text.startsWith('-')) {
    return 'NotUnary';
  }

  const index = sequence.indexOf(hostId);
  if (index <= 0) {
    return 'UnaryMinus';
  }

  const previous = getPreviousToken(sequence, index, tokens);
  if (!previous) {
    return 'UnaryMinus';
  }

  const prevText = previous.text?.trim();
  if (!prevText) {
    return 'UnaryMinus';
  }

  const lastChar = prevText.slice(-1);
  if (isOperatorCharacter(lastChar) || isOpeningDelimiter(lastChar)) {
    return 'UnaryMinus';
  }

  if (isOperatorRole(previous.role)) {
    return 'UnaryMinus';
  }

  return 'NotUnary';
}

export function makeSignId(hostId: string): string {
  return `${hostId}${SIGN_SUFFIX}`;
}

export function makeMagId(hostId: string): string {
  return `${hostId}${MAG_SUFFIX}`;
}

export function isVirtual(id: string): boolean {
  return id.endsWith(SIGN_SUFFIX) || id.endsWith(MAG_SUFFIX);
}

export function hostOfVirtual(id: string): string {
  if (id.endsWith(SIGN_SUFFIX)) {
    return id.slice(0, -SIGN_SUFFIX.length);
  }

  if (id.endsWith(MAG_SUFFIX)) {
    return id.slice(0, -MAG_SUFFIX.length);
  }

  return id;
}

export function focusForUnary(ast: AST, hostId: string): {
  signId: string;
  magId: string;
  signedSpan: string[];
} {
  const tokens = readTokens(ast);
  const sequence = readSequence(ast, tokens);
  const index = sequence.indexOf(hostId);

  if (index === -1) {
    return {
      signId: makeSignId(hostId),
      magId: makeMagId(hostId),
      signedSpan: [hostId],
    };
  }

  const span: string[] = [hostId];
  const current = tokens.get(hostId);
  if (current?.text?.length === 1) {
    const nextId = sequence[index + 1];
    if (nextId) {
      span.push(nextId);
    }
  }

  return {
    signId: makeSignId(hostId),
    magId: makeMagId(hostId),
    signedSpan: span,
  };
}
