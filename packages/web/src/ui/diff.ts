const DIFF_CLASS_ADD = 'motor-diff-add';
const DIFF_CLASS_DEL = 'motor-diff-del';
const DIFF_CLASS_CHG = 'motor-diff-chg';

type ReadonlyStringArray = readonly string[];

type SnapshotMap = ReadonlyMap<string, ReadonlyStringArray>;

export interface MathDiffSnapshot {
  readonly tokens: SnapshotMap;
  readonly nodes: SnapshotMap;
  readonly edges: SnapshotMap;
}

export interface MathDiffSummary {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly changed: readonly string[];
}

export interface MathDiffChanges {
  readonly tokens: MathDiffSummary;
  readonly nodes: MathDiffSummary;
  readonly edges: MathDiffSummary;
}

export interface MathDiffHandle {
  captureSnapshot(): MathDiffSnapshot;
  applyDiff(before: MathDiffSnapshot | null, after: MathDiffSnapshot | null): MathDiffChanges;
  clear(): void;
  destroy(): void;
}

const EMPTY_CHANGES: MathDiffChanges = {
  tokens: { added: [], removed: [], changed: [] },
  nodes: { added: [], removed: [], changed: [] },
  edges: { added: [], removed: [], changed: [] },
};

const EMPTY_MAP: SnapshotMap = new Map();

function escapeAttribute(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeTextContent(element: Element): string {
  const raw = 'textContent' in element ? element.textContent ?? '' : '';
  return raw.replace(/\s+/g, ' ').trim();
}

function readDiffValue(element: HTMLElement): string {
  const override = element.getAttribute('data-diff-value');
  if (override !== null) {
    return override;
  }
  return normalizeTextContent(element);
}

function captureGroup(
  host: HTMLElement,
  selector: string,
  getId: (element: HTMLElement) => string | null,
): SnapshotMap {
  const buckets = new Map<string, string[]>();
  const nodes = host.querySelectorAll<HTMLElement>(selector);
  nodes.forEach((node) => {
    if (node.closest('.motor-ghost')) {
      return;
    }
    if (node.closest('[data-role="motor-ghost-token"]')) {
      return;
    }
    const id = getId(node);
    if (!id) {
      return;
    }
    const value = readDiffValue(node);
    const bucket = buckets.get(id);
    if (bucket) {
      bucket.push(value);
    } else {
      buckets.set(id, [value]);
    }
  });

  const snapshot = new Map<string, ReadonlyStringArray>();
  for (const [id, values] of buckets) {
    snapshot.set(id, Object.freeze([...values]));
  }
  return snapshot;
}

function captureTokens(host: HTMLElement): SnapshotMap {
  return captureGroup(host, '[data-token-id]', (element) => {
    const id = element.dataset.tokenId;
    return typeof id === 'string' && id.length > 0 ? id : null;
  });
}

function captureNodes(host: HTMLElement): SnapshotMap {
  return captureGroup(host, '[data-node-id]', (element) => {
    const id = element.getAttribute('data-node-id');
    return id && id.trim() ? id : null;
  });
}

function captureEdges(host: HTMLElement): SnapshotMap {
  return captureGroup(host, '[data-from][data-to]', (element) => {
    const from = element.getAttribute('data-from');
    const to = element.getAttribute('data-to');
    if (!from || !to) {
      return null;
    }
    return `${from}\u2192${to}`;
  });
}

export function captureMathDiffSnapshot(host: HTMLElement): MathDiffSnapshot {
  return {
    tokens: captureTokens(host),
    nodes: captureNodes(host),
    edges: captureEdges(host),
  };
}

function arraysEqual(a: ReadonlyStringArray, b: ReadonlyStringArray): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

function diffMaps(before: SnapshotMap, after: SnapshotMap): MathDiffSummary {
  const beforeKeys = new Set(before.keys());
  const afterKeys = new Set(after.keys());

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  afterKeys.forEach((key) => {
    if (!beforeKeys.has(key)) {
      added.push(key);
    }
  });

  beforeKeys.forEach((key) => {
    if (!afterKeys.has(key)) {
      removed.push(key);
    }
  });

  afterKeys.forEach((key) => {
    if (!beforeKeys.has(key)) {
      return;
    }
    const beforeValues = before.get(key) ?? [];
    const afterValues = after.get(key) ?? [];
    if (!arraysEqual(beforeValues, afterValues)) {
      changed.push(key);
    }
  });

  added.sort();
  removed.sort();
  changed.sort();

  return {
    added,
    removed,
    changed,
  };
}

export function computeMathDiff(
  before: MathDiffSnapshot | null,
  after: MathDiffSnapshot | null,
): MathDiffChanges {
  if (!before || !after) {
    return EMPTY_CHANGES;
  }
  return {
    tokens: diffMaps(before.tokens ?? EMPTY_MAP, after.tokens ?? EMPTY_MAP),
    nodes: diffMaps(before.nodes ?? EMPTY_MAP, after.nodes ?? EMPTY_MAP),
    edges: diffMaps(before.edges ?? EMPTY_MAP, after.edges ?? EMPTY_MAP),
  };
}

function markElements(
  host: HTMLElement,
  ids: readonly string[],
  className: string,
  selectorFactory: (id: string) => string,
  active: Set<HTMLElement>,
): void {
  ids.forEach((id) => {
    const selector = selectorFactory(id);
    host.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      if (element.closest('.motor-ghost')) {
        return;
      }
      if (element.closest('[data-role="motor-ghost-token"]')) {
        return;
      }
      element.classList.add(className);
      active.add(element);
    });
  });
}

export function createMathDiffOverlay(host: HTMLElement): MathDiffHandle {
  const active = new Set<HTMLElement>();

  const clearActive = () => {
    active.forEach((element) => {
      element.classList.remove(DIFF_CLASS_ADD, DIFF_CLASS_DEL, DIFF_CLASS_CHG);
    });
    active.clear();
  };

  const applyDiff = (
    before: MathDiffSnapshot | null,
    after: MathDiffSnapshot | null,
  ): MathDiffChanges => {
    const changes = computeMathDiff(before, after);
    clearActive();

    markElements(
      host,
      changes.tokens.added,
      DIFF_CLASS_ADD,
      (id) => `[data-token-id="${escapeAttribute(id)}"]`,
      active,
    );
    markElements(
      host,
      changes.tokens.changed,
      DIFF_CLASS_CHG,
      (id) => `[data-token-id="${escapeAttribute(id)}"]`,
      active,
    );
    markElements(
      host,
      changes.nodes.added,
      DIFF_CLASS_ADD,
      (id) => `[data-node-id="${escapeAttribute(id)}"]`,
      active,
    );
    markElements(
      host,
      changes.nodes.changed,
      DIFF_CLASS_CHG,
      (id) => `[data-node-id="${escapeAttribute(id)}"]`,
      active,
    );
    markElements(
      host,
      changes.edges.added,
      DIFF_CLASS_ADD,
      (id) => {
        const [from, to] = id.split('\u2192');
        return `[data-from="${escapeAttribute(from ?? '')}"][data-to="${escapeAttribute(to ?? '')}"]`;
      },
      active,
    );
    markElements(
      host,
      changes.edges.changed,
      DIFF_CLASS_CHG,
      (id) => {
        const [from, to] = id.split('\u2192');
        return `[data-from="${escapeAttribute(from ?? '')}"][data-to="${escapeAttribute(to ?? '')}"]`;
      },
      active,
    );

    if (
      changes.tokens.removed.length > 0 ||
      changes.nodes.removed.length > 0 ||
      changes.edges.removed.length > 0
    ) {
      host.classList.add(DIFF_CLASS_DEL);
      active.add(host);
    }

    return changes;
  };

  return {
    captureSnapshot: () => captureMathDiffSnapshot(host),
    applyDiff,
    clear: clearActive,
    destroy: clearActive,
  };
}
