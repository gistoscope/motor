import { createEventHub, type EventHub, type EventMap } from './events';

export interface ShortestPanelEvents extends EventMap {
  'shortest:enabled': { enabled: boolean };
  'shortest:warning': {
    code: 'WEB.E3.NEGATIVE_WEIGHT' | 'WEB.E4.NO_PATH' | null;
    message?: string | null;
  };
  'shortest:reset': {};
}

export type ShortestPanelEventHub = EventHub<ShortestPanelEvents>;

export function createShortestPanelEventHub(): ShortestPanelEventHub {
  return createEventHub<ShortestPanelEvents>();
}
