const DEFAULT_DURATION_MS = 4000;

export type ToastKind = 'success' | 'error';

export interface ToastManagerOptions {
  container?: HTMLElement | null;
  durationMs?: number;
}

export interface ToastManagerHandle {
  readonly element: HTMLElement;
  show(message: string, kind?: ToastKind, durationMs?: number): void;
  success(message: string, durationMs?: number): void;
  error(message: string, durationMs?: number): void;
  destroy(): void;
}

export function createToastManager(
  doc: Document,
  options: ToastManagerOptions = {},
): ToastManagerHandle {
  const ownerDocument = doc;
  const ownerWindow = ownerDocument.defaultView ?? window;
  const createdContainer = !options.container;
  const container = options.container ?? ownerDocument.createElement('div');

  if (createdContainer) {
    container.dataset.role = container.dataset.role ?? 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    ownerDocument.body.appendChild(container);
  } else if (!container.dataset.role) {
    container.dataset.role = 'toast-container';
  }

  const timers = new Map<HTMLElement, number>();

  const removeToast = (toast: HTMLElement) => {
    if (!container.contains(toast)) {
      return;
    }
    const timer = timers.get(toast);
    if (timer != null) {
      ownerWindow.clearTimeout(timer);
      timers.delete(toast);
    }
    toast.removeEventListener('pointerdown', handlePointerDown);
    toast.remove();
  };

  const handlePointerDown = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }
    removeToast(target);
  };

  const scheduleRemoval = (toast: HTMLElement, duration: number) => {
    const timeout = ownerWindow.setTimeout(() => {
      timers.delete(toast);
      removeToast(toast);
    }, Math.max(0, duration));
    timers.set(toast, timeout);
  };

  const show = (message: string, kind: ToastKind = 'success', duration?: number) => {
    const text = String(message ?? '').trim();
    if (!text) {
      return;
    }
    const toast = ownerDocument.createElement('div');
    toast.dataset.role = 'toast';
    toast.dataset.kind = kind;
    toast.textContent = text;
    toast.tabIndex = 0;
    toast.addEventListener('pointerdown', handlePointerDown);
    container.appendChild(toast);
    const timeout = duration ?? options.durationMs ?? DEFAULT_DURATION_MS;
    scheduleRemoval(toast, timeout);
  };

  const destroy = () => {
    for (const toast of Array.from(timers.keys())) {
      removeToast(toast);
    }
    if (createdContainer && container.parentElement) {
      container.remove();
    }
  };

  return {
    element: container,
    show,
    success(message: string, duration?: number) {
      show(message, 'success', duration);
    },
    error(message: string, duration?: number) {
      show(message, 'error', duration);
    },
    destroy,
  };
}
