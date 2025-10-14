import type { Rational } from './types.js';
import { literal, mul, div, type AST } from './types.js';
import { reduceAndNormalize } from './reduce.js';

const MUL_TOKENS = new Set(['×', '*']);
const DIV_TOKENS = new Set(['÷', '/']);

export class Stage1ParseError extends Error {}

interface TokenBase<T extends string> {
  type: T;
}

interface NumberToken extends TokenBase<'number'> {
  value: Rational;
}

interface OpToken extends TokenBase<'mul' | 'div'> {}

interface PunctuationToken extends TokenBase<'lpar' | 'rpar'> {}

type Token = NumberToken | OpToken | PunctuationToken;

export function tokenizeStage1(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === ' ' || char === '\t' || char === '\n') {
      index += 1;
      continue;
    }
    if (char === '(') {
      tokens.push({ type: 'lpar' });
      index += 1;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'rpar' });
      index += 1;
      continue;
    }
    if (MUL_TOKENS.has(char)) {
      tokens.push({ type: 'mul' });
      index += 1;
      continue;
    }
    if (DIV_TOKENS.has(char)) {
      tokens.push({ type: 'div' });
      index += 1;
      continue;
    }
    if (char === '-' || char === '.' || isDigit(char)) {
      const { nextIndex, value } = readNumber(source, index);
      tokens.push({ type: 'number', value });
      index = nextIndex;
      continue;
    }
    throw new Stage1ParseError(`Unexpected character '${char}' at ${index}`);
  }
  return tokens;
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function readNumber(source: string, start: number): { nextIndex: number; value: Rational } {
  let index = start;
  let sign = 1n;
  if (source[index] === '-') {
    sign = -1n;
    index += 1;
  }

  const integerStart = index;
  let integerDigits = '';
  while (index < source.length && isDigit(source[index]!)) {
    integerDigits += source[index]!;
    index += 1;
  }

  let fractionalDigits = '';
  if (index < source.length && source[index] === '.') {
    index += 1; // skip '.'
    const fracStart = index;
    while (index < source.length && isDigit(source[index]!)) {
      fractionalDigits += source[index]!;
      index += 1;
    }
    if (index === fracStart) {
      throw new Stage1ParseError(`Expected digit after decimal point at ${fracStart}`);
    }
  }

  if (integerDigits.length === 0 && fractionalDigits.length === 0) {
    throw new Stage1ParseError(`Expected digit at ${integerStart}`);
  }

  let denominator = 1n;
  let numerator: bigint;

  if (fractionalDigits.length > 0) {
    denominator = 10n ** BigInt(fractionalDigits.length);
    const numeratorText = (integerDigits.length === 0 ? '0' : integerDigits) + fractionalDigits;
    numerator = BigInt(numeratorText) * sign;
  } else {
    numerator = BigInt(integerDigits) * sign;
  }

  const value: Rational = reduceAndNormalize({ n: numerator, d: denominator });
  return { nextIndex: index, value };
}

export function parseStage1Expression(source: string): AST {
  const tokens = tokenizeStage1(source);
  let position = 0;

  const peek = () => tokens[position];
  const take = () => tokens[position++];

  const expect = (type: Token['type']) => {
    const token = take();
    if (!token || token.type !== type) {
      throw new Stage1ParseError(`Expected token ${type}`);
    }
    return token;
  };

  function parseExpression(): AST {
    let node = parseFactor();
    while (true) {
      const token = peek();
      if (!token || (token.type !== 'mul' && token.type !== 'div')) {
        break;
      }
      take();
      const right = parseFactor();
      node = token.type === 'mul' ? mul(node, right) : div(node, right);
    }
    return node;
  }

  function parseFactor(): AST {
    const token = peek();
    if (!token) {
      throw new Stage1ParseError('Unexpected end of input');
    }
    if (token.type === 'number') {
      take();
      return literal(token.value);
    }
    if (token.type === 'lpar') {
      take();
      const node = parseExpression();
      expect('rpar');
      return node;
    }
    throw new Stage1ParseError('Expected number or (');
  }

  const ast = parseExpression();
  if (position !== tokens.length) {
    throw new Stage1ParseError('Trailing input');
  }
  return ast;
}

export function formatStage1(ast: AST): string {
  switch (ast.type) {
    case 'Literal': {
      const value = ast.value;
      if (value.d === 1n) {
        return value.n.toString();
      }
      return `(${value.n.toString()}/${value.d.toString()})`;
    }
    case 'Mul': {
      return `(${formatStage1(ast.left)} × ${formatStage1(ast.right)})`;
    }
    case 'Div': {
      const rightSymbol = ast.right.type === 'Div' ? '÷' : '/';
      if (rightSymbol === '/') {
        return `(${formatStage1(ast.left)}/${formatStage1(ast.right)})`;
      }
      return `(${formatStage1(ast.left)} ${rightSymbol} ${formatStage1(ast.right)})`;
    }
    case 'Add': {
      return `(${formatStage1(ast.left)} + ${formatStage1(ast.right)})`;
    }
    case 'Sub': {
      return `(${formatStage1(ast.left)} - ${formatStage1(ast.right)})`;
    }
    default:
      throw new Error(`UNHANDLED_AST_TYPE:${(ast as { type: string }).type}`);
  }
}

export function formatRational(value: Rational): string {
  const normalized = reduceAndNormalize(value);
  if (normalized.d === 1n) {
    return normalized.n.toString();
  }
  return `${normalized.n.toString()}/${normalized.d.toString()}`;
}
