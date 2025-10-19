import type { NodeId } from './opTokens';
import type { TsaModule } from '../types';
import * as tsaRuntime from '@motor/tsa';

// Prefer real TSA types if available; fall back to any to keep strict mode.
type StageAst = any;

// Narrow adapter surface for TIL:
export type ListActions = (ast: StageAst, focus: NodeId[]) => string[];
export type CanApply   = (ast: StageAst, rule: string, focus: NodeId[]) => boolean;
export type ApplyOne   = (ast: StageAst, rule: string, focus: NodeId[]) =>
  | { ok: true; ast: StageAst }
  | { ok: false; reason?: string };

export function hasTsa(): boolean {
  return true;
}

// Lazy import to avoid type coupling:
let tsa: TsaModule | null = null;
function useTsa() {
  if (!tsa) {
    try {
      const maybeRequire = (globalThis as { require?: (id: string) => any }).require;
      if (typeof maybeRequire === 'function') {
        tsa = maybeRequire('@motor/tsa') as TsaModule;
      } else {
        tsa = tsaRuntime as TsaModule;
      }
    } catch {
      tsa = tsaRuntime as TsaModule;
    }
  }
  return tsa as TsaModule;
}

// Heuristic mapping for basic operators → canonical rule ids (override-able by TIL executor map)
const DEFAULT_RULES: Record<string, string> = {
  '+': 'add',
  '-': 'sub',
  '×': 'mul',
  '*': 'mul',
  '÷': 'div',
  '/': 'div',
  '^': 'pow',
};

export const listActions: ListActions = (ast, _focus) => {
  const api = useTsa();
  // Prefer TSA discovery if present (e.g., api.listActions)
  if (typeof api.listActions === 'function') {
    try { return Array.isArray(api.listActions(ast, _focus)) ? api.listActions(ast, _focus) : []; } catch { /*noop*/ }
  }
  // Fallback: expose the basic rule set
  return Object.values(DEFAULT_RULES);
};

export const canApply: CanApply = (ast, rule, focus) => {
  const api = useTsa();
  if (typeof api.canApply === 'function') {
    try { return !!api.canApply(ast, rule, focus); } catch { return false; }
  }
  // Fallback: allow; executor will still normalize focus
  return !!rule;
};

export const applyOne: ApplyOne = (ast, rule, focus) => {
  const api = useTsa();
  // Prefer targeted apply if API exists
  if (typeof api.applyOne === 'function') {
    try {
      const res = api.applyOne(ast, rule, focus);
      if (res && 'ast' in res && res.ast) return { ok: true, ast: res.ast };
      return { ok: false, reason: 'applyOne returned no ast' };
    } catch (e: any) {
      return { ok: false, reason: String(e?.message || e) };
    }
  }
  // Fallback: try next-step global rule application as a demo
  if (typeof api.applyNextRule === 'function') {
    try {
      const res = api.applyNextRule(ast, rule); // if rule not used, TSA may pick the next applicable
      if (res && 'ast' in res && res.ast) return { ok: true, ast: res.ast };
      return { ok: false, reason: 'applyNextRule returned no ast' };
    } catch (e: any) {
      return { ok: false, reason: String(e?.message || e) };
    }
  }
  return { ok: false, reason: 'No TSA entrypoints found' };
};

export const RULE_MAP = DEFAULT_RULES;
