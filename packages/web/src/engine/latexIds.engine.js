/**
 * CC06A.2 (JS версии): оборачивание видимых кусочков формулы в \htmlId{<id>}{...}.
 * Fallback-токенизация покрывает цифры/буквы/операторы/скобки и игнорирует TeX-команды.
 */

function texEscape(s) {
  return s.replace(/}/g, '\\}');
}

function simpleTokenize(src) {
  const out = [];
  const re = /(\\[A-Za-z]+)|([0-9A-Za-z]+)|([+\-*/=()])|(\s+)|./g;
  let m, i = 0;
  while ((m = re.exec(src))) {
    const frag = m[0], texCmd = m[1], word = m[2], sym = m[3], space = m[4];
    const start = m.index;
    const end = start + frag.length;
    if (texCmd || space || frag === undefined) continue;
    if (word || sym) out.push({ id: `tok:${i++}`, start, end });
  }
  return out;
}

/**
 * @param {string} src
 * @param {{ getTokens?: (src:string)=>Array<{id:string,start:number,end:number}> }} [opts]
 */
export function withHtmlIdsFromEngine(src, opts) {
  const tokens = (opts && opts.getTokens ? opts.getTokens(src) : simpleTokenize(src))
    .slice().sort((a,b)=>a.start-b.start);
  if (!tokens.length) return src;

  let out = '', cursor = 0;
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
