import { createActionsPanel } from '../ui/actions';
import { createGhostOverlay } from '../ui/ghost';
import { createHistoryPanel, type HistoryEntry } from '../ui/history';
import { createMathDiffOverlay, type MathDiffSnapshot } from '../ui/diff';
import { applyRuleTooltip } from '../ui/tooltips';
import { createWarningsPanel } from '../ui/warnings';
import { createToastManager } from '../ui/toast';
import type {
  MathBridgeHandle,
  MathBridgeOptions,
  MathEngine,
  MathEngineEventName,
  MathEngineAction,
} from './types';

const DEFAULT_HOVER_CLASS = 'math-token--hovered';
const DEFAULT_SELECTED_CLASS = 'math-token--selected';
const LONG_PRESS_DELAY = 450;

function isIterable(value: unknown): value is Iterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function escapeAttribute(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function coerceToString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function extractTokenIdsFromPayload(payload: unknown): string[] {
  if (payload == null) {
    return [];
  }

  if (typeof payload === 'string') {
    return [payload];
  }

  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return [String(payload)];
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => coerceToString(item))
      .filter((item): item is string => item !== null);
  }

  if (typeof payload === 'object') {
    const source = payload as Record<string, unknown>;
    const possibleLists = ['ids', 'tokens', 'tokenIds'];
    for (const key of possibleLists) {
      const maybeList = source[key];
      if (Array.isArray(maybeList)) {
        return maybeList
          .map((item) => coerceToString(item))
          .filter((item): item is string => item !== null);
      }
      if (isIterable(maybeList)) {
        return Array.from(maybeList)
          .map((item) => coerceToString(item))
          .filter((item): item is string => item !== null);
      }
    }

    const possibleScalars = ['id', 'tokenId', 'target'];
    for (const key of possibleScalars) {
      const maybe = source[key];
      const str = coerceToString(maybe);
      if (str !== null) {
        return [str];
      }
    }
  }

  return [];
}

function removeClassFromIds(
  host: HTMLElement,
  ids: Iterable<string>,
  className: string,
): void {
  for (const id of ids) {
    const selector = `[data-token-id="${escapeAttribute(id)}"]`;
    host
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => el.classList.remove(className));
  }
}

function addClassToIds(host: HTMLElement, ids: Iterable<string>, className: string): void {
  for (const id of ids) {
    const selector = `[data-token-id="${escapeAttribute(id)}"]`;
    host
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => el.classList.add(className));
  }
}

function dedupe(ids: Iterable<string>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function normalizeTokenIds(
  event: Extract<MathEngineEventName, 'hover' | 'select'>,
  payload: unknown,
  options: MathBridgeOptions,
): string[] {
  if (options.getTokenIds) {
    const result = Array.from(options.getTokenIds(event, payload));
    return dedupe(
      result
        .map((item) => coerceToString(item))
        .filter((value): value is string => value !== null),
    );
  }
  return dedupe(extractTokenIdsFromPayload(payload));
}

function gatherPreviewTokenIds(source: unknown): string[] {
  return gatherPreviewTokenIdsInternal(source, new Set());
}

function gatherPreviewTokenIdsInternal(source: unknown, visited: Set<unknown>): string[] {
  if (source == null) {
    return [];
  }
  if (typeof source === 'string') {
    return [source];
  }
  if (typeof source === 'number' && Number.isFinite(source)) {
    return [String(source)];
  }
  if (typeof source === 'boolean') {
    return [];
  }
  if (Array.isArray(source)) {
    const result: string[] = [];
    for (const item of source) {
      result.push(...gatherPreviewTokenIdsInternal(item, visited));
    }
    return result;
  }
  if (typeof source === 'object') {
    if (visited.has(source)) {
      return [];
    }
    visited.add(source);
    const record = source as Record<string, unknown>;
    const tokens: string[] = [];

    if (typeof record.kind === 'string' && typeof record.value === 'string') {
      const normalizedKind = record.kind.toLowerCase();
      if (['token', 'identifier', 'id'].includes(normalizedKind)) {
        tokens.push(record.value);
      }
    }

    const directKeys: Array<[unknown, boolean]> = [
      [record.token, true],
      [record.tokenId, true],
      [record.value, false],
      [record.left, true],
      [record.right, true],
      [record.start, true],
      [record.end, true],
      [record.startId, true],
      [record.endId, true],
      [record.from, true],
      [record.to, true],
    ];

    for (const [value, acceptStringsOnly] of directKeys) {
      const str = coerceToString(value);
      if (str && (acceptStringsOnly || typeof value === 'string')) {
        tokens.push(str);
      }
    }

    const nestedKeys = [
      'tokens',
      'tokenIds',
      'ids',
      'values',
      'items',
      'elements',
      'nodes',
      'list',
      'path',
      'targets',
      'target',
      'selection',
      'selections',
      'range',
      'ranges',
      'highlights',
      'locations',
      'expressions',
    ];

    for (const key of nestedKeys) {
      if (key in record) {
        tokens.push(...gatherPreviewTokenIdsInternal(record[key], visited));
      }
    }

    return tokens;
  }
  return [];
}

function extractPreviewInfo(payload: unknown): { actionId: string | null; tokenIds: string[] } | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidateKeys = [
    'preview',
    'previewSelection',
    'previewTarget',
    'previewTokens',
    'previewRange',
    'ghost',
    'ghostPreview',
    'actionPreview',
    'pendingPreview',
    'suggestionPreview',
  ];

  let preview: unknown = undefined;
  for (const key of candidateKeys) {
    if (key in record) {
      preview = record[key];
      break;
    }
  }

  if (preview === undefined) {
    return null;
  }

  if (preview === null) {
    return { actionId: null, tokenIds: [] };
  }

  if (typeof preview === 'string') {
    return { actionId: preview, tokenIds: [] };
  }

  if (typeof preview === 'number' && Number.isFinite(preview)) {
    return { actionId: String(preview), tokenIds: [] };
  }

  if (Array.isArray(preview)) {
    return { actionId: null, tokenIds: dedupe(gatherPreviewTokenIds(preview)) };
  }

  if (typeof preview === 'object') {
    const previewRecord = preview as Record<string, unknown>;
    const actionId =
      coerceToString(previewRecord.stepId) ??
      coerceToString(previewRecord.actionId) ??
      coerceToString(previewRecord.ruleId) ??
      coerceToString(previewRecord.id) ??
      coerceToString(previewRecord.key) ??
      null;

    const nested = [
      'tokens',
      'tokenIds',
      'ids',
      'values',
      'items',
      'elements',
      'nodes',
      'list',
      'path',
      'highlights',
      'targets',
      'target',
      'selection',
      'selections',
      'range',
      'ranges',
      'locations',
    ];

    let tokens: string[] = [];
    for (const key of nested) {
      if (key in previewRecord) {
        tokens.push(...gatherPreviewTokenIds(previewRecord[key]));
      }
    }
    if (tokens.length === 0) {
      tokens = gatherPreviewTokenIds(previewRecord);
    }

    return { actionId, tokenIds: dedupe(tokens) };
  }

  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    const type = target.type.toLowerCase();
    return !['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset', 'image'].includes(type);
  }
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  return false;
}

function findTokenElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  return target.closest<HTMLElement>('[data-token-id]');
}

function getTokenIdFromEvent(target: EventTarget | null): string | null {
  const tokenEl = findTokenElement(target);
  if (!tokenEl) {
    return null;
  }
  const tokenId = tokenEl.dataset.tokenId;
  return typeof tokenId === 'string' && tokenId.length > 0 ? tokenId : null;
}

type ExtendedMathBridgeOptions = MathBridgeOptions & {
  historyContainer?: HTMLElement;
  warningsContainer?: HTMLElement;
};

function normalizeNotes(notes: unknown): string[] {
  if (!Array.isArray(notes)) {
    return [];
  }
  const result: string[] = [];
  for (const note of notes) {
    if (typeof note === 'string') {
      const trimmed = note.trim();
      if (trimmed.length > 0) {
        result.push(trimmed);
      }
    }
  }
  return result;
}

function captureExpression(hostEl: HTMLElement): string {
  const text = hostEl.textContent ?? '';
  return text.replace(/\s+/g, ' ').trim();
}

export function attachMathEngine(
  viewer: unknown,
  engine: MathEngine,
  hostEl: HTMLElement,
  options: ExtendedMathBridgeOptions = {} as ExtendedMathBridgeOptions,
): MathBridgeHandle {
  void viewer;

  const ownerDocument = hostEl.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;
  const toaster = createToastManager(ownerDocument, {
    container: options.toastContainer ?? null,
    durationMs: options.toastDurationMs,
  });
  const instrumentationOnAction = options.instrumentation?.onAction ?? null;

  const hoverClass = options.classNames?.hovered ?? DEFAULT_HOVER_CLASS;
  const selectedClass = options.classNames?.selected ?? DEFAULT_SELECTED_CLASS;

  let hoveredIds = new Set<string>();
  let selectedIds = new Set<string>();

  const ghostOverlay = createGhostOverlay(hostEl);
  let ghostTokenIds = new Set<string>();
  const diffOverlay = createMathDiffOverlay(hostEl);
  let lastDiffSnapshot: MathDiffSnapshot | null = null;
  const engineRecord = engine as unknown as Record<string, unknown>;
  const previewNullableCandidates = ['preview', 'setPreview', 'previewStep', 'previewRule'] as const;
  let previewFn: ((id: string | null) => void) | null = null;
  for (const key of previewNullableCandidates) {
    const candidate = engineRecord[key];
    if (typeof candidate === 'function') {
      previewFn = (candidate as (id: string | null) => void).bind(engine);
      break;
    }
  }

  const previewStrictCandidates = [
    'previewAction',
    'showPreview',
    'suggestPreview',
    'hintPreview',
    'previewCommand',
  ] as const;
  let previewStrictFn: ((id: string) => void) | null = null;
  for (const key of previewStrictCandidates) {
    const candidate = engineRecord[key];
    if (typeof candidate === 'function') {
      previewStrictFn = (candidate as (id: string) => void).bind(engine);
      break;
    }
  }

  const clearPreviewCandidate = (engine as { clearPreview?: () => void }).clearPreview;
  const clearPreviewFn = typeof clearPreviewCandidate === 'function' ? clearPreviewCandidate.bind(engine) : null;

  let previewRequestId: string | null = null;
  let lastActions = new Map<string, MathEngineAction>();
  let pendingAction: { id: string; label: string; startedAt: number } | null = null;

  const renderGhost = (ids: Iterable<string>) => {
    const tokens = dedupe(ids);
    if (tokens.length === 0) {
      if (ghostTokenIds.size > 0) {
        ghostOverlay.clear();
      }
      ghostTokenIds = new Set();
      return;
    }
    const next = new Set(tokens);
    if (tokens.length === ghostTokenIds.size) {
      let identical = true;
      for (const token of next) {
        if (!ghostTokenIds.has(token)) {
          identical = false;
          break;
        }
      }
      if (identical) {
        return;
      }
    }
    ghostOverlay.render(tokens);
    ghostTokenIds = next;
  };

  const clearPreview = () => {
    const shouldNotify = previewRequestId !== null || ghostTokenIds.size > 0;
    previewRequestId = null;
    if (shouldNotify) {
      if (clearPreviewFn) {
        try {
          clearPreviewFn();
        } catch {
          // ignore preview cleanup errors
        }
      } else if (previewFn) {
        try {
          previewFn(null);
        } catch {
          // ignore preview cleanup errors
        }
      }
    }
    renderGhost([]);
  };

  const requestPreview = (actionId: string | null) => {
    if (actionId === null) {
      clearPreview();
      return;
    }
    previewRequestId = actionId;
    if (previewFn) {
      try {
        previewFn(actionId);
      } catch {
        // ignore preview errors
      }
      return;
    }
    if (previewStrictFn) {
      try {
        previewStrictFn(actionId);
      } catch {
        // ignore preview errors
      }
    }
  };

  const getActionLabel = (actionId: string | null): string => {
    if (!actionId) {
      return '';
    }
    const action = lastActions.get(actionId);
    if (action && typeof action.label === 'string' && action.label.trim().length > 0) {
      return action.label;
    }
    if (pendingAction && pendingAction.id === actionId && pendingAction.label.trim().length > 0) {
      return pendingAction.label;
    }
    return actionId;
  };

  const formatApplyError = (actionId: string, reason: unknown): string => {
    const label = getActionLabel(actionId) || actionId;
    let message = '';
    if (reason instanceof Error) {
      message = String(reason.message ?? '').trim();
    } else if (typeof reason === 'string') {
      message = reason.trim();
    }
    if (!message) {
      if (reason && typeof reason === 'object') {
        try {
          message = JSON.stringify(reason);
        } catch {
          message = '';
        }
      }
      if (!message) {
        message = 'Unknown error';
      }
    }
    return `Failed to apply ${label}: ${message}`;
  };

  const completePendingAction = (
    outcome: 'ok' | 'err',
    detail: { ruleId?: string | null; message?: string; error?: unknown } = {},
  ) => {
    if (!pendingAction) {
      return;
    }
    const { id, label, startedAt } = pendingAction;
    pendingAction = null;
    const duration = Math.max(0, Date.now() - startedAt);
    if (instrumentationOnAction) {
      try {
        instrumentationOnAction(id, duration, outcome);
      } catch {
        // ignore instrumentation errors
      }
    }
    if (outcome === 'ok') {
      const custom = detail.message ? detail.message.trim() : '';
      if (custom) {
        toaster.success(custom);
        return;
      }
      const resolved = detail.ruleId ? getActionLabel(detail.ruleId) : '';
      const finalLabel = (resolved && resolved.trim().length > 0 ? resolved : '') || label || id;
      const safeLabel = finalLabel.trim().length > 0 ? finalLabel.trim() : 'Action';
      toaster.success(`${safeLabel} applied`);
      return;
    }
    const message = detail.message ?? formatApplyError(id, detail.error);
    toaster.error(message);
  };

  let actionsPanel: ReturnType<typeof createActionsPanel> | null = null;

  const applyAction = (actionId: string, { highlight }: { highlight?: boolean } = {}): boolean => {
    const targetId = actionId.trim();
    if (!targetId) {
      return false;
    }
    if (pendingAction) {
      return false;
    }
    clearPreview();
    const label = getActionLabel(targetId).trim();
    pendingAction = { id: targetId, label: label || targetId, startedAt: Date.now() };
    try {
      engine.apply(targetId);
      if (highlight) {
        actionsPanel?.highlight(targetId);
      }
      return true;
    } catch (error) {
      const message = formatApplyError(targetId, error);
      completePendingAction('err', { message, error });
      return false;
    }
  };

  if (options.actionsContainer) {
    actionsPanel = createActionsPanel(options.actionsContainer, {
      onAction: (actionId) => {
        applyAction(actionId, { highlight: true });
      },
    });
  }

  const historyPanel = options.historyContainer
    ? createHistoryPanel(options.historyContainer, {
        onUndo: () => {
          if (supportsUndo) {
            applyAction('undo');
          }
        },
        onRedo: () => {
          if (supportsRedo) {
            applyAction('redo');
          }
        },
      })
    : null;

  const warningsPanel = options.warningsContainer
    ? createWarningsPanel(options.warningsContainer)
    : null;

  let historyEntries: HistoryEntry[] = [];
  let appliedHistoryCount = 0;
  let supportsUndo = false;
  let supportsRedo = false;
  let currentExpression = '';

  const updateHistoryPanel = () => {
    if (!historyPanel) {
      return;
    }
    historyPanel.render(historyEntries, appliedHistoryCount, {
      canUndo: supportsUndo && appliedHistoryCount > 0,
      canRedo: supportsRedo && appliedHistoryCount < historyEntries.length,
    });
  };

  const refreshActions = () => {
    const actions = engine.getLegalActions();
    lastActions = new Map(actions.map((action) => [action.id, action]));
    supportsUndo = actions.some((action) => action.id === 'undo');
    supportsRedo = actions.some((action) => action.id === 'redo');

    if (actionsPanel) {
      actionsPanel.render(actions);
      if (options.actionsContainer) {
        const lookup = new Map(actions.map((action) => [action.id, action]));
        const buttons = options.actionsContainer.querySelectorAll<HTMLButtonElement>(
          'button[data-role="math-action"]',
        );
        buttons.forEach((button) => {
          const actionId = button.dataset.actionId ?? '';
          if (!actionId) {
            return;
          }
          const action = lookup.get(actionId);
          const payload = action ?? { id: actionId, label: button.textContent ?? actionId };
          applyRuleTooltip(button, payload);
        });
      }
    }

    if (actions.length === 0 || (previewRequestId && !actions.some((action) => action.id === previewRequestId))) {
      clearPreview();
    }

    updateHistoryPanel();
  };

  const updateHighlight = (
    event: Extract<MathEngineEventName, 'hover' | 'select'>,
    payload: unknown,
  ) => {
    const ids = normalizeTokenIds(event, payload, options);
    const className = event === 'hover' ? hoverClass : selectedClass;
    const previous = event === 'hover' ? hoveredIds : selectedIds;

    removeClassFromIds(hostEl, previous, className);
    addClassToIds(hostEl, ids, className);

    const target = event === 'hover' ? hoveredIds : selectedIds;
    target.clear();
    for (const id of ids) {
      target.add(id);
    }
  };

  const rawSelect = (engine as { select?: ((mode: string) => void) | undefined }).select;
  const engineSelect: ((mode: string) => void) | null =
    typeof rawSelect === 'function' ? rawSelect.bind(engine) : null;

  const callSelect = (mode: string) => {
    if (!engineSelect) {
      return;
    }
    engineSelect(mode);
  };

  let selectionModeTimer: number | null = null;
  let longPressTimer: number | null = null;
  let longPressActive = false;

  const scheduleSelectionModeReset = () => {
    if (selectionModeTimer !== null) {
      ownerWindow.clearTimeout(selectionModeTimer);
    }
    selectionModeTimer = ownerWindow.setTimeout(() => {
      delete hostEl.dataset.selectionMode;
      selectionModeTimer = null;
    }, 600);
  };

  const activateSelectionMode = (persistent: boolean) => {
    hostEl.dataset.selectionMode = 'multi';
    if (persistent) {
      if (selectionModeTimer !== null) {
        ownerWindow.clearTimeout(selectionModeTimer);
        selectionModeTimer = null;
      }
    } else {
      scheduleSelectionModeReset();
    }
  };

  const deactivateSelectionMode = () => {
    if (selectionModeTimer !== null) {
      ownerWindow.clearTimeout(selectionModeTimer);
      selectionModeTimer = null;
    }
    delete hostEl.dataset.selectionMode;
  };

  const toggleMultiSelect = (tokenId: string) => {
    const mode = selectedIds.has(tokenId) ? 'remove' : 'add';
    callSelect(mode);
  };

  const findActionButton = (target: EventTarget | null): HTMLButtonElement | null => {
    if (!(target instanceof HTMLElement)) {
      return null;
    }
    return target.closest<HTMLButtonElement>('button[data-role="math-action"]');
  };

  const handleActionPointerOver = (event: PointerEvent) => {
    const button = findActionButton(event.target);
    const actionId = button?.dataset.actionId ?? null;
    if (actionId) {
      requestPreview(actionId);
    }
  };

  const handleActionFocusIn = (event: FocusEvent) => {
    const button = findActionButton(event.target);
    const actionId = button?.dataset.actionId ?? null;
    if (actionId) {
      requestPreview(actionId);
    }
  };

  const handleActionPointerOut = (event: PointerEvent) => {
    const current = findActionButton(event.target);
    if (!current) {
      return;
    }
    const related = findActionButton(event.relatedTarget);
    if (related) {
      return;
    }
    clearPreview();
  };

  const handleActionPointerLeave = () => {
    clearPreview();
  };

  const handleActionFocusOut = (event: FocusEvent) => {
    const current = findActionButton(event.target);
    if (!current) {
      return;
    }
    const related = findActionButton(event.relatedTarget);
    if (related) {
      return;
    }
    clearPreview();
  };

  const handleClick = (event: MouseEvent) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    const tokenId = getTokenIdFromEvent(event.target);
    if (!tokenId) {
      return;
    }
    event.preventDefault();
    activateSelectionMode(false);
    toggleMultiSelect(tokenId);
  };

  const clearLongPress = () => {
    if (longPressTimer !== null) {
      ownerWindow.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    const tokenId = getTokenIdFromEvent(event.target);
    if (!tokenId) {
      return;
    }
    clearLongPress();
    longPressActive = false;
    longPressTimer = ownerWindow.setTimeout(() => {
      longPressTimer = null;
      longPressActive = true;
      activateSelectionMode(true);
      toggleMultiSelect(tokenId);
    }, LONG_PRESS_DELAY);
  };

  const handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    if (longPressTimer !== null) {
      clearLongPress();
      return;
    }
    if (longPressActive) {
      longPressActive = false;
      deactivateSelectionMode();
    }
  };

  const subscriptions: Array<() => void> = [];

  if (options.actionsContainer) {
    const actionsContainer = options.actionsContainer;
    actionsContainer.addEventListener('pointerover', handleActionPointerOver);
    actionsContainer.addEventListener('focusin', handleActionFocusIn);
    actionsContainer.addEventListener('pointerout', handleActionPointerOut);
    actionsContainer.addEventListener('pointerleave', handleActionPointerLeave);
    actionsContainer.addEventListener('focusout', handleActionFocusOut);
    subscriptions.push(() => {
      actionsContainer.removeEventListener('pointerover', handleActionPointerOver);
      actionsContainer.removeEventListener('focusin', handleActionFocusIn);
      actionsContainer.removeEventListener('pointerout', handleActionPointerOut);
      actionsContainer.removeEventListener('pointerleave', handleActionPointerLeave);
      actionsContainer.removeEventListener('focusout', handleActionFocusOut);
    });
  }

  subscriptions.push(engine.on('hover', (payload) => updateHighlight('hover', payload)));
  subscriptions.push(engine.on('select', (payload) => updateHighlight('select', payload)));
  subscriptions.push(
    engine.on('state', (payload) => {
      const nextDiffSnapshot = diffOverlay.captureSnapshot();
      if (lastDiffSnapshot) {
        diffOverlay.applyDiff(lastDiffSnapshot, nextDiffSnapshot);
      }
      lastDiffSnapshot = nextDiffSnapshot;

      const ruleId = typeof (payload as { ruleId?: unknown })?.ruleId === 'string'
        ? ((payload as { ruleId?: unknown }).ruleId as string)
        : null;

      if (pendingAction) {
        completePendingAction('ok', { ruleId });
      }

      refreshActions();

      const previewInfo = extractPreviewInfo(payload);
      if (previewInfo) {
        if (previewInfo.actionId !== null) {
          previewRequestId = previewInfo.actionId;
        }
        renderGhost(previewInfo.tokenIds);
      } else {
        renderGhost([]);
      }

      if (warningsPanel) {
        const notes = normalizeNotes((payload as { domainNotes?: unknown })?.domainNotes);
        warningsPanel.render(notes);
      }

      const nextExpression = captureExpression(hostEl);

      if (ruleId === 'undo') {
        if (appliedHistoryCount > 0) {
          appliedHistoryCount -= 1;
        }
      } else if (ruleId === 'redo') {
        if (appliedHistoryCount < historyEntries.length) {
          appliedHistoryCount += 1;
        }
      } else if (ruleId) {
        if (appliedHistoryCount < historyEntries.length) {
          historyEntries = historyEntries.slice(0, appliedHistoryCount);
        }
        const entry: HistoryEntry = {
          ruleId,
          before: currentExpression,
          after: nextExpression,
          timestamp: Date.now(),
        };
        historyEntries = [...historyEntries, entry];
        appliedHistoryCount = historyEntries.length;
      } else {
        currentExpression = nextExpression;
        updateHistoryPanel();
        return;
      }

      currentExpression = nextExpression;
      updateHistoryPanel();
    }),
  );

  const handleKeydown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (!event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === 'Enter') {
        const highlighted = actionsPanel?.getHighlightedActionId();
        if (highlighted) {
          event.preventDefault();
          applyAction(highlighted, { highlight: true });
        }
        return;
      }
      if (event.key === 'Escape') {
        if (engineSelect) {
          event.preventDefault();
          deactivateSelectionMode();
          callSelect('clear');
        }
        clearPreview();
        return;
      }
      if (event.key === '[' || event.key === '{') {
        if (engineSelect) {
          event.preventDefault();
          callSelect('scopeDown');
        }
        return;
      }
      if (event.key === ']' || event.key === '}') {
        if (engineSelect) {
          event.preventDefault();
          callSelect('scopeUp');
        }
        return;
      }
    }

    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    if (event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'z') {
      if (event.shiftKey) {
        if (supportsRedo) {
          event.preventDefault();
          applyAction('redo');
        }
      } else if (supportsUndo) {
        event.preventDefault();
        applyAction('undo');
      }
    } else if (key === 'y') {
      if (supportsRedo) {
        event.preventDefault();
        applyAction('redo');
      }
    }
  };

  ownerWindow.addEventListener('keydown', handleKeydown);
  hostEl.addEventListener('click', handleClick);
  hostEl.addEventListener('pointerdown', handlePointerDown);
  hostEl.addEventListener('pointerup', handlePointerEnd);
  hostEl.addEventListener('pointercancel', handlePointerEnd);
  hostEl.addEventListener('pointerleave', handlePointerEnd);
  subscriptions.push(() => {
    ownerWindow.removeEventListener('keydown', handleKeydown);
    hostEl.removeEventListener('click', handleClick);
    hostEl.removeEventListener('pointerdown', handlePointerDown);
    hostEl.removeEventListener('pointerup', handlePointerEnd);
    hostEl.removeEventListener('pointercancel', handlePointerEnd);
    hostEl.removeEventListener('pointerleave', handlePointerEnd);
  });

  engine.mount(hostEl, options.initialExpression ?? '');
  hostEl.appendChild(ghostOverlay.element);
  ghostTokenIds = new Set();
  ghostOverlay.clear();
  refreshActions();
  lastDiffSnapshot = diffOverlay.captureSnapshot();
  currentExpression = captureExpression(hostEl);
  updateHistoryPanel();
  if (warningsPanel) {
    warningsPanel.render([]);
  }

  return {
    destroy() {
      pendingAction = null;
      lastActions = new Map();
      for (const unsubscribe of subscriptions) {
        try {
          unsubscribe();
        } catch {
          // ignore subscriber errors
        }
      }
      subscriptions.length = 0;
      if (actionsPanel) {
        actionsPanel.destroy();
      }
      if (historyPanel) {
        historyPanel.destroy();
      }
      if (warningsPanel) {
        warningsPanel.destroy();
      }
      clearPreview();
      ghostOverlay.destroy();
      ghostTokenIds = new Set();
      diffOverlay.destroy();
      clearLongPress();
      deactivateSelectionMode();
      longPressActive = false;
      removeClassFromIds(hostEl, hoveredIds, hoverClass);
      removeClassFromIds(hostEl, selectedIds, selectedClass);
      hoveredIds = new Set();
      selectedIds = new Set();
      hostEl.innerHTML = '';
      toaster.destroy();
    },
    refresh: refreshActions,
    setExpression(expr: string) {
      clearPreview();
      removeClassFromIds(hostEl, hoveredIds, hoverClass);
      removeClassFromIds(hostEl, selectedIds, selectedClass);
      hoveredIds = new Set();
      selectedIds = new Set();
      clearLongPress();
      deactivateSelectionMode();
      longPressActive = false;
      hostEl.innerHTML = '';
      historyEntries = [];
      appliedHistoryCount = 0;
      pendingAction = null;
      lastActions = new Map();
      engine.mount(hostEl, expr);
      hostEl.appendChild(ghostOverlay.element);
      ghostTokenIds = new Set();
      ghostOverlay.clear();
      refreshActions();
      diffOverlay.clear();
      lastDiffSnapshot = diffOverlay.captureSnapshot();
      currentExpression = captureExpression(hostEl);
      updateHistoryPanel();
      if (warningsPanel) {
        warningsPanel.render([]);
      }
    },
  };
}
