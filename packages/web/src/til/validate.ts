export type Validation =
  | { ok: true }
  | { ok: false; reason: string };

export function validateExpression(src: string): Validation {
  const s = src.trim();
  if (s.length === 0) return { ok: true };

  const binOps = new Set(['+', '-', '×', '÷', '*', '/', '^']);
  const mayBeUnaryMinus = (i: number) => s[i] === '-' && (i === 0 || s[i - 1] === '(');

  let depth = 0;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth < 0) return { ok: false, reason: 'unmatched closing parenthesis' };
    }
  }
  if (depth !== 0) return { ok: false, reason: 'unbalanced parentheses' };

  const last = s[s.length - 1];
  if (binOps.has(last)) {
    return { ok: false, reason: 'trailing operator' };
  }

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '^' || ch === '/') {
      let j = i + 1;
      while (j < s.length && s[j] === ' ') j++;
      if (j >= s.length) return { ok: false, reason: `missing right operand after '${ch}'` };
    }
    if (ch === '+' || ch === '×' || ch === '÷' || ch === '*') {
      let k = i - 1;
      while (k >= 0 && s[k] === ' ') k--;
      if (k < 0 || s[k] === '(') return { ok: false, reason: `operator '${ch}' at invalid position` };
    }
    if (ch === '-') {
      if (mayBeUnaryMinus(i)) {
        continue;
      }
    }
  }

  return { ok: true };
}
