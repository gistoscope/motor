import type { Rational } from './types';
import { add, div, literal, mul, sub, type AST } from './types';
import { reduceAndNormalize } from './reduce';

const MUL_TOKENS = new Set(['×', '*']);
const DIV_TOKENS = new Set(['÷', '/']);

export class Stage2ParseError extends Error {}

type Token =
  | { type: 'number'; value: Rational }
  | { type: 'add' | 'sub' | 'mul' | 'div' }
  | { type: 'lpar' | 'rpar' };

export function tokenizeStage2(source: string): Token[] {
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
    if (char === '+') {
      tokens.push({ type: 'add' });
      index += 1;
      continue;
    }
    if (char === '-') {
      const previous = tokens[tokens.length - 1];
      const canBeUnary =
        !previous ||
        previous.type === 'add' ||
        previous.type === 'sub' ||
        previous.type === 'mul' ||
        previous.type === 'div' ||
        previous.type === 'lpar';
      const nextChar = source[index + 1];
      if (
        canBeUnary &&
        nextChar !== undefined &&
        (isDigit(nextChar) || nextChar === '.')
      ) {
        const { nextIndex, value } = readNumber(source, index);
        tokens.push({ type: 'number', value });
        index = nextIndex;
        continue;
      }
      tokens.push({ type: 'sub' });
      index += 1;
      continue;
    }
    if (isDigit(char) || char === '.') {
      const { nextIndex, value } = readNumber(source, index);
      tokens.push({ type: 'number', value });
      index = nextIndex;
      continue;
    }
    throw new Stage2ParseError(`Unexpected character '${char}' at ${index}`);
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
      throw new Stage2ParseError(`Expected digit after decimal point at ${fracStart}`);
    }
  }

  if (integerDigits.length === 0 && fractionalDigits.length === 0) {
    throw new Stage2ParseError(`Expected digit at ${integerStart}`);
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

export function parseStage2Expression(source: string): AST {
  const tokens = tokenizeStage2(source);
  let position = 0;

  const peek = () => tokens[position];
  const take = () => tokens[position++];

  const expect = (type: Token['type']) => {
    const token = take();
    if (!token || token.type !== type) {
      throw new Stage2ParseError(`Expected token ${type}`);
    }
    return token;
  };

  function parseExpression(): AST {
    return parseAdditive();
  }

  function parseAdditive(): AST {
    let node = parseMultiplicative();
    while (true) {
      const token = peek();
      if (!token || (token.type !== 'add' && token.type !== 'sub')) {
        break;
      }
      take();
      const right = parseMultiplicative();
      node = token.type === 'add' ? add(node, right) : sub(node, right);
    }
    return node;
  }

  function parseMultiplicative(): AST {
    let node = parsePrimary();
    while (true) {
      const token = peek();
      if (!token || (token.type !== 'mul' && token.type !== 'div')) {
        break;
      }
      take();
      const right = parsePrimary();
      node = token.type === 'mul' ? mul(node, right) : div(node, right);
    }
    return node;
  }

  function parsePrimary(): AST {
    const token = peek();
    if (!token) {
      throw new Stage2ParseError('Unexpected end of input');
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
    throw new Stage2ParseError('Expected number or (');
  }

  const ast = parseExpression();
  if (position !== tokens.length) {
    throw new Stage2ParseError('Trailing input');
  }
  return ast;
}

export function formatStage2(ast: AST): string {
  switch (ast.type) {
    case 'Literal': {
      const value = ast.value;
      if (value.d === 1n) {
        return value.n.toString();
      }
      return `(${value.n.toString()}/${value.d.toString()})`;
    }
    case 'Mul': {
      return `(${formatStage2(ast.left)} × ${formatStage2(ast.right)})`;
    }
    case 'Div': {
      const left = formatStage2(ast.left);
      const right = formatStage2(ast.right);
      const rightSymbol = ast.right.type === 'Div' ? '÷' : '/';
      if (rightSymbol === '/') {
        return `(${left}/${right})`;
      }
      return `(${left} ${rightSymbol} ${right})`;
    }
    case 'Add': {
      return `(${formatStage2(ast.left)} + ${formatStage2(ast.right)})`;
    }
    case 'Sub': {
      return `(${formatStage2(ast.left)} - ${formatStage2(ast.right)})`;
    }
    default: {
      const neverAst: never = ast;
      return neverAst;
    }
  }
}
