import type { Path } from '@motor/types';

export const pathKey = (path: Path): string => path.join('.');

export const isSamePath = (a: Path, b: Path): boolean => {
  if (a.length !== b.length) return false;
  return a.every((segment, index) => segment === b[index]);
};

export const isAncestorPath = (ancestor: Path, target: Path): boolean => {
  if (ancestor.length >= target.length) return false;
  return ancestor.every((segment, index) => segment === target[index]);
};
