const TOKEN_ORDER_KEYS = ['linear', 'sequence', 'order', 'tokenOrder'] as const;
const TOKEN_MAP_KEYS = ['tokens', 'tokenMap'] as const;
const TOKEN_LATEX_KEYS = ['latex', 'tex', 'text', 'value', 'symbol', 'content'] as const;
const TOKEN_BEFORE_KEYS = ['before', 'prefix', 'leading', 'spaceBefore'] as const;
const TOKEN_AFTER_KEYS = ['after', 'suffix', 'trailing', 'spaceAfter'] as const;

export interface LatexRangeInfo {
  start: number;
  end: number;
  htmlId: string;
}

export interface LatexGenerationResult {
  latex: string;
  map: Record<string, LatexRangeInfo>;
}

type TokenEntry = {
  id: string;
  latex: string;
  before: string;
  after: string;
};

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return null;
}

function pickStringProperty(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }
    const candidate = record[key];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }
  return null;
}

function extractTokenLatex(token: unknown): string | null {
  if (typeof token === 'string') {
    return token;
  }
  if (typeof token === 'number' && Number.isFinite(token)) {
    return String(token);
  }
  if (!isRecordLike(token)) {
    return null;
  }

  const direct = pickStringProperty(token, TOKEN_LATEX_KEYS);
  if (direct !== null) {
    return direct;
  }

  for (const key of Object.keys(token)) {
    const value = token[key];
    if (!isRecordLike(value)) {
      continue;
    }
    const nested = pickStringProperty(value, TOKEN_LATEX_KEYS);
    if (nested !== null) {
      return nested;
    }
  }

  return null;
}

function extractSpacing(token: unknown, keys: readonly string[]): string {
  if (!isRecordLike(token)) {
    return '';
  }
  for (const key of keys) {
    const candidate = token[key];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return '';
}

function readTokenEntries(ast: unknown): TokenEntry[] {
  if (!isRecordLike(ast)) {
    return [];
  }

  let tokenMap: Map<string, unknown> | null = null;
  for (const key of TOKEN_MAP_KEYS) {
    const candidate = ast[key];
    if (!candidate) {
      continue;
    }
    if (candidate instanceof Map) {
      tokenMap = new Map(candidate);
      break;
    }
    if (Array.isArray(candidate)) {
      tokenMap = new Map();
      candidate.forEach((entry) => {
        if (!entry) {
          return;
        }
        const id = isRecordLike(entry)
          ? pickStringProperty(entry, ['id', 'stableId']) ?? null
          : toStringValue(entry);
        if (!id) {
          return;
        }
        tokenMap!.set(id, entry);
      });
      if (tokenMap.size > 0) {
        break;
      }
      tokenMap = null;
      continue;
    }
    if (isRecordLike(candidate)) {
      tokenMap = new Map(Object.entries(candidate));
      break;
    }
  }

  if (!tokenMap || tokenMap.size === 0) {
    return [];
  }

  let order: string[] | null = null;
  for (const key of TOKEN_ORDER_KEYS) {
    const candidate = ast[key];
    if (Array.isArray(candidate)) {
      order = candidate
        .map((item) => toStringValue(item))
        .filter((item): item is string => item !== null && item.length > 0);
      if (order.length > 0) {
        break;
      }
      order = null;
    }
  }

  const entries: TokenEntry[] = [];
  const seen = new Set<string>();

  const processId = (id: string) => {
    if (seen.has(id)) {
      return;
    }
    const token = tokenMap!.get(id);
    if (!token) {
      return;
    }
    const latex = extractTokenLatex(token);
    if (latex === null) {
      return;
    }
    const before = extractSpacing(token, TOKEN_BEFORE_KEYS);
    const after = extractSpacing(token, TOKEN_AFTER_KEYS);
    entries.push({ id, latex, before, after });
    seen.add(id);
  };

  if (order) {
    order.forEach((id) => {
      if (id) {
        processId(id);
      }
    });
  }

  tokenMap.forEach((_token, id) => {
    if (!seen.has(id)) {
      processId(id);
    }
  });

  return entries;
}

function makeHtmlId(id: string, fallbackIndex: number): string {
  const base = `node-${id}`;
  const sanitized = base
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  if (sanitized.length > 0) {
    return sanitized;
  }
  return `node-${fallbackIndex}`;
}

function extractNodeSpans(ast: unknown): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!isRecordLike(ast)) {
    return map;
  }

  const maybeNodes = ast.nodes ?? ast.byId;
  if (!isRecordLike(maybeNodes)) {
    return map;
  }

  Object.entries(maybeNodes).forEach(([id, value]) => {
    if (!value) {
      return;
    }
    if (Array.isArray(value)) {
      const span = value.map((item) => toStringValue(item)).filter((item): item is string => item !== null);
      if (span.length > 0) {
        map.set(id, span);
      }
      return;
    }
    if (isRecordLike(value)) {
      const spanCandidates = ['span', 'range', 'tokens'];
      for (const key of spanCandidates) {
        const candidate = value[key];
        if (!Array.isArray(candidate)) {
          continue;
        }
        const span = candidate.map((item) => toStringValue(item)).filter((item): item is string => item !== null);
        if (span.length > 0) {
          map.set(id, span);
          return;
        }
      }
    }
  });

  return map;
}

function fallbackLatexFromObject(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (isRecordLike(value)) {
    const candidates = ['latex', 'tex', 'expression', 'value'];
    for (const key of candidates) {
      const candidate = value[key];
      if (typeof candidate === 'string') {
        return candidate;
      }
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return String(candidate);
      }
    }
  }
  return '';
}

export function latexFromAst(input: unknown): LatexGenerationResult {
  if (typeof input === 'string') {
    return { latex: input, map: {} };
  }
  if (typeof input === 'number' && Number.isFinite(input)) {
    return { latex: String(input), map: {} };
  }

  const entries = readTokenEntries(input);
  const map: Record<string, LatexRangeInfo> = {};

  if (entries.length === 0) {
    const fallback = fallbackLatexFromObject(input);
    return { latex: fallback, map };
  }

  const pieces: string[] = [];
  let cursor = 0;

  entries.forEach((entry, index) => {
    if (entry.before) {
      pieces.push(entry.before);
      cursor += entry.before.length;
    }
    const htmlId = makeHtmlId(entry.id, index);
    const chunk = `\\htmlId{${htmlId}}{${entry.latex}}`;
    const start = cursor;
    pieces.push(chunk);
    cursor += chunk.length;
    map[entry.id] = { start, end: cursor, htmlId };
    if (entry.after) {
      pieces.push(entry.after);
      cursor += entry.after.length;
    }
  });

  const latex = pieces.join('');
  const nodeSpans = extractNodeSpans(input);

  nodeSpans.forEach((span, nodeId) => {
    if (nodeId in map) {
      return;
    }
    const ranges = span
      .map((tokenId) => map[tokenId])
      .filter((info): info is LatexRangeInfo => Boolean(info));
    if (ranges.length === 0) {
      return;
    }
    const start = Math.min(...ranges.map((info) => info.start));
    const end = Math.max(...ranges.map((info) => info.end));
    const htmlId = makeHtmlId(nodeId, entries.length + ranges.length);
    map[nodeId] = { start, end, htmlId };
  });

  return { latex, map };
}
