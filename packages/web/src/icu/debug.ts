declare global {
  interface Window {
    __icu?: {
      hoverReady: boolean;
      clickReady: boolean;
      bracketsReady: boolean;
      dragReady: boolean;
      multiReady: boolean;
      selection: import('./api').SelectionState;
    };
  }
}
export {};
