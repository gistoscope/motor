import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { createEngine } from '../core/src/index.js';
import { parse } from '../parser/src/index.js';
import {
  evaluateExpression,
  formatRational,
  parseStage1Expression,
  parseStage2Expression
} from '../tsa/src/index.js';
import type { Rational } from '../tsa/src/types.js';

type InvariantCase = {
  name: string;
  input: string;
  expected: string;
  notes?: string;
};

const must = (value: Rational | { error: string }): Rational => {
  if ('error' in value) {
    throw new Error(`Expected rational result, received ${value.error}`);
  }
  return value;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.resolve(__dirname, '../testdata/invariant-1.json');
const cases: InvariantCase[] = JSON.parse(readFileSync(fixturePath, 'utf8'));

describe('Invariant #1 cross-package agreement', () => {
  for (const entry of cases) {
    const runner = entry.notes === 'todo' ? it.skip : it;
    runner(`${entry.name} :: ${entry.input}`, () => {
      const engine = createEngine();
      const parsed = parse(entry.input);
      const simplified = engine.simplify(parsed);
      expect(engine.print(simplified)).toBe(entry.expected);

      const stage2 = parseStage2Expression(entry.input);
      expect(formatRational(must(evaluateExpression(stage2)))).toBe(entry.expected);

      const stage1 = parseStage1Expression(entry.input);
      expect(formatRational(must(evaluateExpression(stage1)))).toBe(entry.expected);
    });
  }
});
