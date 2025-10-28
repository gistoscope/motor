declare module '../../demo/ui/dom.helpers.js' {
  export function resolveVisibleLeaf(el: Element | null): Element | null;
  export function nearestTokFromComposedPath(ev: Event): HTMLElement | null;
}
