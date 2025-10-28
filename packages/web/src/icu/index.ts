import type { InstallOptions, ICUInstance, SelectionState } from './api';

export function installICU(opts: InstallOptions): ICUInstance {
  const w = opts.doc.defaultView as any;
  if (!w.__icu) {
    w.__icu = {
      hoverReady: false,
      clickReady: false,
      bracketsReady: false,
      dragReady: false,
      multiReady: false,
      selection: { regions: [], focusIndex: null } as SelectionState
    };
  }
  // L0 foundation: no event wiring yet
  return { dispose() { /* no-op */ } };
}
