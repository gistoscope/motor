import { getWarningMessage, type WebWarningCode } from '../errors';
import type { EventHub } from './events';

export type ShortestPanelState = 'hidden' | 'disabled' | 'ready';

export interface ShortestPanelElements {
  panel: HTMLElement;
  sourceValue: HTMLElement;
  targetValue: HTMLElement;
  totalValue: HTMLElement;
  infoValue: HTMLElement;
  warningPanel: HTMLElement;
  warningValue: HTMLElement;
  runButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
}

export interface ShortestPanelEvents {
  'shortest:values': { source: string | null; target: string | null; total: number | null };
  'shortest:info': { state: ShortestPanelState; message: string };
  'shortest:warning': WebWarningCode | null;
  'shortest:controls': { canRun: boolean; canReset: boolean };
}

export interface ShortestPanelOptions {
  placeholder?: string;
}

export function bindShortestPanel(
  hub: EventHub<ShortestPanelEvents>,
  elements: ShortestPanelElements,
  options: ShortestPanelOptions = {},
): () => void {
  const dash = options.placeholder ?? '—';
  const unsubscribers: Array<() => void> = [];

  const { panel, sourceValue, targetValue, totalValue, infoValue, warningPanel, warningValue, runButton, resetButton } =
    elements;

  panel.dataset.state = panel.dataset.state ?? 'hidden';
  panel.hidden = panel.dataset.state === 'hidden';
  warningPanel.dataset.state = warningPanel.dataset.state ?? 'hidden';
  warningPanel.hidden = warningPanel.dataset.state === 'hidden';

  unsubscribers.push(
    hub.on('shortest:values', ({ source, target, total }) => {
      sourceValue.textContent = source ?? dash;
      targetValue.textContent = target ?? dash;
      totalValue.textContent = total !== null && total !== undefined ? String(total) : dash;
    }),
  );

  unsubscribers.push(
    hub.on('shortest:info', ({ state, message }) => {
      panel.dataset.state = state;
      panel.hidden = state === 'hidden';
      infoValue.textContent = message;
    }),
  );

  unsubscribers.push(
    hub.on('shortest:warning', (code) => {
      if (code) {
        warningPanel.dataset.state = 'ready';
        warningPanel.hidden = false;
        warningValue.dataset.code = code;
        warningValue.textContent = getWarningMessage(code);
      } else {
        warningPanel.dataset.state = 'hidden';
        warningPanel.hidden = true;
        warningValue.dataset.code = '';
        warningValue.textContent = '';
      }
    }),
  );

  unsubscribers.push(
    hub.on('shortest:controls', ({ canRun, canReset }) => {
      runButton.disabled = !canRun;
      resetButton.disabled = !canReset;
    }),
  );

  return () => {
    while (unsubscribers.length) {
      const release = unsubscribers.pop();
      try {
        release?.();
      } catch {
        // Ignore errors from listener teardown.
      }
    }
    panel.dataset.state = 'hidden';
    panel.hidden = true;
    warningPanel.dataset.state = 'hidden';
    warningPanel.hidden = true;
    warningValue.dataset.code = '';
    warningValue.textContent = '';
    runButton.disabled = true;
    resetButton.disabled = true;
    sourceValue.textContent = dash;
    targetValue.textContent = dash;
    totalValue.textContent = dash;
    infoValue.textContent = '';
  };
}
