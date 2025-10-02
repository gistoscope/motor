import { Result, ok, fail } from '../result';
import { formatFraction, parseSimpleFraction, gcd, SimpleFraction } from './util';

interface AtomOutput {
  expr: string;
}

export function divFractionsToReciprocal(source: string): Result<AtomOutput> {
  const trimmed = source.trim();
  const match = /^\(\s*(\([^()]+\))\s*÷\s*(\([^()]+\))\s*\)$/.exec(trimmed);
  if (!match) {
    return fail();
  }

  const left = parseSimpleFraction(match[1]);
  const right = parseSimpleFraction(match[2]);

  if (!left.ok || !right.ok) {
    return fail();
  }

  const reciprocal = formatFraction({
    numerator: right.value.denominator,
    denominator: right.value.numerator
  });

  const expr = `(${formatFraction(left.value)} × ${reciprocal})`;
  return ok({ expr });
}

export function mulFractionsToSingle(source: string): Result<AtomOutput> {
  const trimmed = source.trim();
  const match = /^\(\s*(\([^()]+\))\s*×\s*(\([^()]+\))\s*\)$/.exec(trimmed);
  if (!match) {
    return fail();
  }

  const left = parseSimpleFraction(match[1]);
  const right = parseSimpleFraction(match[2]);

  if (!left.ok || !right.ok) {
    return fail();
  }

  const numeratorExpr = `(${left.value.numerator}*${right.value.numerator})`;
  const denominatorExpr = `(${left.value.denominator}*${right.value.denominator})`;
  const expr = formatFraction({ numerator: numeratorExpr, denominator: denominatorExpr });
  return ok({ expr });
}

export function reduceFraction(source: string): Result<AtomOutput> {
  const parsed = parseSimpleFraction(source);
  if (!parsed.ok) {
    return fail();
  }

  const numerator = Number(parsed.value.numerator);
  const denominator = Number(parsed.value.denominator);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return fail();
  }

  const divisor = gcd(numerator, denominator);
  if (divisor <= 1) {
    return fail();
  }

  const reduced: SimpleFraction = {
    numerator: String(numerator / divisor),
    denominator: String(denominator / divisor)
  };

  return ok({ expr: formatFraction(reduced) });
}

export function normalizeSigns(source: string): Result<AtomOutput> {
  const parsed = parseSimpleFraction(source);
  if (!parsed.ok) {
    return fail();
  }

  const numeratorValue = Number(parsed.value.numerator);
  const denominatorValue = Number(parsed.value.denominator);
  if (!Number.isFinite(numeratorValue) || !Number.isFinite(denominatorValue)) {
    return fail();
  }

  if (denominatorValue === 0) {
    return fail();
  }

  let newNumerator = numeratorValue;
  let newDenominator = denominatorValue;
  let changed = false;

  if (newDenominator < 0) {
    newNumerator = -newNumerator;
    newDenominator = -newDenominator;
    changed = true;
  }

  if (!changed) {
    return fail();
  }

  const normalized: SimpleFraction = {
    numerator: String(newNumerator),
    denominator: String(newDenominator)
  };

  return ok({ expr: formatFraction(normalized) });
}
