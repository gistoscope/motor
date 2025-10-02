import { ok, fail, Result } from '../result';

export interface SimpleFraction {
  numerator: string;
  denominator: string;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

export function isInt(value: string): boolean {
  return /^-?\d+$/.test(value.trim());
}

export function parseSimpleFraction(source: string): Result<SimpleFraction> {
  const trimmed = source.trim();
  const match = /^\(\s*\(?\s*(-?\d+)\s*\)?\s*\/\s*\(?\s*(-?\d+)\s*\)?\s*\)$/.exec(trimmed);
  if (!match) {
    return fail();
  }
  const numerator = match[1];
  const denominator = match[2];
  if (!isInt(numerator) || !isInt(denominator)) {
    return fail();
  }
  return ok<SimpleFraction>({ numerator, denominator });
}

export function formatFraction(parts: SimpleFraction): string {
  return `(${parts.numerator}/${parts.denominator})`;
}
