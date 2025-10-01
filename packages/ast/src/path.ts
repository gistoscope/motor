import type { Expr, Path, PathSegment } from '@motor/types';

export function getAtPath(expr: Expr, path: Path): Expr | null {
  let node: Expr | null = expr;
  for (const step of path) {
    node = node ? child(node, step) : null;
    if (!node) return null;
  }
  return node;
}

export function isValidPath(expr: Expr, path: Path): boolean {
  return getAtPath(expr, path) !== null;
}

export function replaceAtPath(expr: Expr, path: Path, replacement: Expr): Expr {
  return updateAtPath(expr, path, () => replacement);
}

export function updateAtPath(expr: Expr, path: Path, updater: (node: Expr) => Expr): Expr {
  if (path.length === 0) {
    return updater(expr);
  }
  const [step, ...rest] = path;
  switch (expr.type) {
    case 'add':
    case 'mul': {
      if (typeof step !== 'number' || step < 0 || step >= expr.args.length) {
        return expr;
      }
      const updatedChild = rest.length === 0
        ? updater(expr.args[step])
        : updateAtPath(expr.args[step], rest, updater);
      if (updatedChild === expr.args[step]) return expr;
      const args = expr.args.slice();
      args[step] = updatedChild;
      return expr.type === 'add' ? { type: 'add', args } : { type: 'mul', args };
    }
    case 'sub':
    case 'div':
    case 'pow': {
      if (step !== 'left' && step !== 'right') return expr;
      const target = step === 'left' ? expr.left : expr.right;
      const updatedChild = rest.length === 0
        ? updater(target)
        : updateAtPath(target, rest, updater);
      if (updatedChild === target) return expr;
      return { ...expr, [step]: updatedChild } as Expr;
    }
    case 'sqrt':
    case 'cbrt': {
      if (step !== 'arg') return expr;
      const updatedChild = rest.length === 0
        ? updater(expr.arg)
        : updateAtPath(expr.arg, rest, updater);
      if (updatedChild === expr.arg) return expr;
      return { ...expr, arg: updatedChild };
    }
    case 'rat':
      return expr;
  }
}

function child(expr: Expr, step: PathSegment): Expr | null {
  switch (expr.type) {
    case 'add':
    case 'mul':
      return typeof step === 'number' ? expr.args[step] ?? null : null;
    case 'sub':
    case 'div':
    case 'pow':
      if (step === 'left') return expr.left;
      if (step === 'right') return expr.right;
      return null;
    case 'sqrt':
    case 'cbrt':
      return step === 'arg' ? expr.arg : null;
    case 'rat':
      return null;
  }
}
