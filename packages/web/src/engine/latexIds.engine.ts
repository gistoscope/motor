import type {} from 'node:fs';

/**
 * CC06A: оборачивание видимых кусочков формулы в \htmlId{<id>}{...}.
 * По возможности используем логические ID от движка (через getTokens),
 * иначе — fallback: простая токенизация цифр/букв/операторов/скобок.
 */

export type Token = {
  id: string;
  start: number;
  end: number;
};

export type TokenProvider = (src: string) => Token[];

/** Экранируем закрывающую фигурную скобку в содержимом токена */
function texEscape(s: string): string {
  return s.replace(/}/g, '\\}');
}

/** Fallback: очень простой разбор видимых атомов, игнорируя TeX-команды */
function simpleTokenize(src: string): Token[] {
  const out: Token[] = [];
  const re = /(\\[A-Za-z]+)|([0-9A-Za-z]+)|([+\-*/=()])|(\s+)|./g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(src))) {
    const [frag, texCmd, word, sym, space] = m;
    const start = m.index;
    const end = start + frag.length;
    if (texCmd || space || frag === undefined) continue;
    if (word || sym) {
      out.push({ id: `tok:${i++}`, start, end });
    }
  }
  return out;
}

export function withHtmlIdsFromEngine(src: string, opts?: { getTokens?: TokenProvider }): string {
  const tokens = (opts?.getTokens ? opts.getTokens(src) : simpleTokenize(src))
    .slice()
    .sort((a, b) => a.start - b.start);
  if (!tokens.length) return src;

  let out = '';
  let cursor = 0;
  for (const t of tokens) {
    const s = Math.max(cursor, Math.max(0, Math.min(src.length, t.start)));
    const e = Math.max(s, Math.min(src.length, t.end));
    if (s > cursor) out += src.slice(cursor, s);
    const body = texEscape(src.slice(s, e));
    out += `\\htmlId{${t.id}}{${body}}`;
    cursor = e;
  }
  if (cursor < src.length) out += src.slice(cursor);
  return out;
}

export default withHtmlIdsFromEngine;
