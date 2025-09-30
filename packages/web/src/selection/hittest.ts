import type { Path } from '@motor/types';

const parseSegment = (value: string) => {
  if (value === 'left' || value === 'right' || value === 'arg') {
    return value;
  }
  const maybeIndex = Number(value);
  return Number.isNaN(maybeIndex) ? value : maybeIndex;
};

export const parsePath = (value: string): Path =>
  value === '' ? [] : value.split('.').map(segment => parseSegment(segment));

export const findPath = (element: HTMLElement | null): Path | null => {
  let el: HTMLElement | null = element;
  while (el) {
    const attr = el.getAttribute('data-path');
    if (attr !== null) {
      return parsePath(attr);
    }
    el = el.parentElement;
  }
  return null;
};
