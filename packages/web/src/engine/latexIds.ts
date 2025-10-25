import { createTokenElementId } from '../util/tokenAnchors';

export type IdProvider = (fragment: string, index: number) => string | null | undefined;

type Token =
  | { kind: 'space'; value: string }
  | { kind: 'raw'; value: string }
  | { kind: 'text'; value: string }
  | { kind: 'command'; value: string };

const TOKEN_WRAPPER_CLASS = 'gv-token';
const PROTECTED_COMMANDS = new Set(['\\htmlId', '\\htmlClass', '\\htmlStyle']);
const COMMANDS_WITH_ARGUMENTS = new Set(['\\left', '\\right']);

function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

function isRawControl(char: string): boolean {
  return (
    char === '{' ||
    char === '}' ||
    char === '^' ||
    char === '_' ||
    char === '&' ||
    char === '#' ||
    char === '%' ||
    char === '[' ||
    char === ']'
  );
}

function tokenizeLatex(source: string): Token[] {
  const tokens: Token[] = [];
  let buffer = '';

  const flushBuffer = () => {
    if (buffer) {
      tokens.push({ kind: 'text', value: buffer });
      buffer = '';
    }
  };

  for (let index = 0; index < source.length; ) {
    const char = source[index];

    if (char === '\\') {
      flushBuffer();
      let cursor = index + 1;
      if (cursor >= source.length) {
        tokens.push({ kind: 'command', value: '\\' });
        index = cursor;
        continue;
      }
      if (/^[a-zA-Z]$/.test(source[cursor] ?? '')) {
        cursor += 1;
        while (cursor < source.length && /^[a-zA-Z]$/.test(source[cursor] ?? '')) {
          cursor += 1;
        }
      } else {
        cursor += 1;
      }
      const command = source.slice(index, cursor);
      tokens.push({ kind: 'command', value: command });
      index = cursor;
      continue;
    }

    if (isWhitespace(char)) {
      flushBuffer();
      tokens.push({ kind: 'space', value: char });
      index += 1;
      continue;
    }

    if (isRawControl(char)) {
      flushBuffer();
      tokens.push({ kind: 'raw', value: char });
      index += 1;
      continue;
    }

    buffer += char;
    index += 1;
  }

  flushBuffer();
  return tokens;
}

function shouldWrapCommand(command: string, nextToken: Token | undefined): boolean {
  if (!command) {
    return false;
  }
  if (PROTECTED_COMMANDS.has(command)) {
    return false;
  }
  if (COMMANDS_WITH_ARGUMENTS.has(command)) {
    return false;
  }
  if (nextToken && nextToken.kind === 'raw' && nextToken.value === '{') {
    return false;
  }
  return true;
}

function wrapFragment(fragment: string, index: number, idProvider: IdProvider): string {
  const tokenId = idProvider(fragment, index);
  if (!tokenId) {
    return fragment;
  }
  const htmlId = createTokenElementId(tokenId);
  return `\\htmlClass{${TOKEN_WRAPPER_CLASS}}{\\htmlId{${htmlId}}{${fragment}}}`;
}

function splitTextFragment(value: string): string[] {
  if (!value) {
    return [];
  }
  return Array.from(value);
}

export const defaultIdProvider: IdProvider = (_fragment, index) => `tok:${index}`;

export function withHtmlIds(source: string, idProvider: IdProvider = defaultIdProvider): string {
  if (!source) {
    return source;
  }
  if (source.includes('\\htmlId{gv:V1:')) {
    return source;
  }
  const tokens = tokenizeLatex(source);
  const result: string[] = [];
  let counter = 0;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === 'space' || token.kind === 'raw') {
      result.push(token.value);
      continue;
    }
    if (token.kind === 'command') {
      const nextToken = tokens[index + 1];
      if (shouldWrapCommand(token.value, nextToken)) {
        const wrapped = wrapFragment(token.value, counter, idProvider);
        if (wrapped !== token.value) {
          counter += 1;
        }
        result.push(wrapped);
      } else {
        result.push(token.value);
      }
      continue;
    }
    if (token.kind === 'text') {
      const fragments = splitTextFragment(token.value);
      for (const fragment of fragments) {
        if (!fragment.trim()) {
          result.push(fragment);
          continue;
        }
        const wrapped = wrapFragment(fragment, counter, idProvider);
        if (wrapped !== fragment) {
          counter += 1;
        }
        result.push(wrapped);
      }
      continue;
    }
  }

  return result.join('');
}
