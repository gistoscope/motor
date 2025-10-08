import {
  HighlightControllerLike,
  HighlightId,
  HighlightRegistrationOptions,
  HighlightRenderItem,
  HighlightSnapshot,
  HighlightTether,
  HighlightRole,
} from './types';

interface Registration {
  element: HTMLElement;
  role: HighlightRole;
  bracketGroup?: string;
  accent: 'primary' | 'muted';
  padding: number;
}

interface ActiveHighlight {
  id: HighlightId;
  intensity: number;
  activatedAt: number;
}

const DEFAULT_PADDING = 6;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class HighlightController implements HighlightControllerLike {
  private host: HTMLElement | null = null;
  private registrations = new Map<HighlightId, Registration>();
  private actives = new Map<HighlightId, ActiveHighlight>();
  private listeners = new Set<() => void>();
  private snapshot: HighlightSnapshot = { items: [], tethers: [], activeIds: [] };

  register(element: HTMLElement, options: HighlightRegistrationOptions): () => void {
    const registration: Registration = {
      element,
      role: options.role ?? 'token',
      bracketGroup: options.bracketGroup,
      accent: options.accent ?? 'primary',
      padding: options.padding ?? DEFAULT_PADDING,
    };
    this.registrations.set(options.id, registration);

    const handleResize = () => this.emit();
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(element);

    const transitionListener = handleResize;
    element.addEventListener('transitionend', transitionListener);
    element.addEventListener('animationend', transitionListener);

    this.emit();

    const cleanup = () => {
      resizeObserver?.disconnect();
      element.removeEventListener('transitionend', transitionListener);
      element.removeEventListener('animationend', transitionListener);
      this.registrations.delete(options.id);
      this.actives.delete(options.id);
      this.emit();
    };

    return cleanup;
  }

  highlight(ids: HighlightId[], intensity = 1): void {
    const timestamp = now();
    let changed = false;
    ids.forEach((id) => {
      if (!this.registrations.has(id)) return;
      const prev = this.actives.get(id);
      if (prev) {
        if (prev.intensity !== intensity) {
          this.actives.set(id, { ...prev, intensity });
          changed = true;
        }
      } else {
        this.actives.set(id, { id, intensity, activatedAt: timestamp });
        changed = true;
      }
    });

    if (changed) {
      this.emit();
    }
  }

  pulse(ids: HighlightId[], intensity = 1): void {
    const timestamp = now();
    let changed = false;
    ids.forEach((id) => {
      if (!this.registrations.has(id)) return;
      this.actives.set(id, { id, intensity, activatedAt: timestamp });
      changed = true;
    });

    if (changed) {
      this.emit();
    }
  }

  clear(ids?: HighlightId[]): void {
    if (!ids) {
      if (this.actives.size === 0) return;
      this.actives.clear();
      this.emit();
      return;
    }

    let changed = false;
    ids.forEach((id) => {
      if (this.actives.delete(id)) {
        changed = true;
      }
    });

    if (changed) {
      this.emit();
    }
  }

  setHost(element: HTMLElement | null): void {
    this.host = element;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): HighlightSnapshot {
    return this.snapshot;
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  private buildSnapshot(): HighlightSnapshot {
    if (!this.host) {
      return { items: [], tethers: [], activeIds: [] };
    }

    const hostRect = this.host.getBoundingClientRect();
    const items: HighlightRenderItem[] = [];
    const tethers: HighlightTether[] = [];

    for (const [id, active] of this.actives.entries()) {
      const registration = this.registrations.get(id);
      if (!registration) continue;
      const rect = registration.element.getBoundingClientRect();
      const padding = registration.padding;
      const x = rect.left - hostRect.left - padding;
      const y = rect.top - hostRect.top - padding;
      const width = rect.width + padding * 2;
      const height = rect.height + padding * 2;
      const radius = Math.min(width, height) / 2;

      items.push({
        id,
        rect: { x, y, width, height, radius },
        role: registration.role,
        accent: registration.accent,
        intensity: active.intensity,
        activatedAt: active.activatedAt,
        bracketGroup: registration.bracketGroup,
      });
    }

    const bracketGroups = new Map<string, HighlightRenderItem[]>();
    for (const item of items) {
      if (!item.bracketGroup || item.role !== 'bracket') continue;
      const list = bracketGroups.get(item.bracketGroup) ?? [];
      list.push(item);
      bracketGroups.set(item.bracketGroup, list);
    }

    for (const [groupId, groupItems] of bracketGroups.entries()) {
      if (groupItems.length < 2) continue;
      const sorted = [...groupItems].sort((a, b) => a.rect.x - b.rect.x);
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const from = {
        x: first.rect.x + first.rect.width / 2,
        y: first.rect.y + first.rect.height + 4,
      };
      const to = {
        x: last.rect.x + last.rect.width / 2,
        y: last.rect.y + last.rect.height + 4,
      };
      const activatedAt = Math.max(first.activatedAt, last.activatedAt);
      tethers.push({
        id: `tether-${groupId}`,
        from,
        to,
        activatedAt,
      });
    }

    const activeIds = items.map((item) => item.id);

    return { items, tethers, activeIds };
  }
}

export function createHighlightController(): HighlightControllerLike {
  return new HighlightController();
}
