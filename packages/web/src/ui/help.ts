import {
  isHTMLElement,
  isHTMLInputElement,
  isHTMLTextAreaElement,
} from '../util/dom';

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const HOTKEYS: Array<{ key: string; description: string }> = [
  { key: 'Ctrl + Enter / ⌘ + Enter', description: 'Parse the Graph JSON input' },
  { key: 'Space / Enter', description: 'Activate the focused node (select)' },
  { key: '? (Shift + /)', description: 'Open this help overlay' },
  { key: 'Esc', description: 'Close modals, overlays, and panels' },
];

const GESTURES: Array<{ key: string; description: string }> = [
  { key: 'Click a node', description: 'Select the node and show its details' },
  { key: 'Hover a node', description: 'Highlight connected edges and nodes' },
  { key: 'Click empty canvas', description: 'Clear the current selection' },
  { key: 'Toggle checkboxes', description: 'Show SCC, cycle edge, or shortest path overlays' },
  { key: 'High contrast checkbox', description: 'Enable high-contrast colors for the viewer' },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!isHTMLElement(target)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (isHTMLTextAreaElement(target)) {
    return true;
  }
  if (isHTMLInputElement(target)) {
    const type = target.type?.toLowerCase?.() ?? '';
    return !['button', 'checkbox', 'radio', 'range', 'color', 'file', 'submit', 'reset', 'image'].includes(type);
  }
  return false;
}

function createList(doc: Document, items: Array<{ key: string; description: string }>): HTMLElement {
  const list = doc.createElement('ul');
  list.className = 'motor-help-overlay__list';
  items.forEach(({ key, description }) => {
    const item = doc.createElement('li');
    item.className = 'motor-help-overlay__item';

    const keyEl = doc.createElement('span');
    keyEl.className = 'motor-help-overlay__key';
    keyEl.textContent = key;

    const descriptionEl = doc.createElement('span');
    descriptionEl.textContent = description;

    item.appendChild(keyEl);
    item.appendChild(descriptionEl);
    list.appendChild(item);
  });
  return list;
}

export interface HelpOverlayHandle {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  destroy(): void;
}

export interface HelpInitOptions {
  root: HTMLElement;
  trigger?: HTMLElement | null;
  document?: Document;
}

export function initHelp(options: HelpInitOptions): HelpOverlayHandle {
  const doc = options.document ?? options.root.ownerDocument ?? document;
  const overlay = doc.createElement('div');
  overlay.className = 'motor-help-overlay';
  overlay.dataset.state = 'hidden';
  overlay.setAttribute('aria-hidden', 'true');

  const dialog = doc.createElement('div');
  dialog.className = 'motor-help-overlay__dialog';
  dialog.id = 'motor-help-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'motor-help-title');
  dialog.tabIndex = -1;

  const header = doc.createElement('div');
  header.className = 'motor-help-overlay__header';

  const title = doc.createElement('h2');
  title.className = 'motor-help-overlay__title';
  title.id = 'motor-help-title';
  title.textContent = 'Viewer help';

  const closeButton = doc.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'viewer__button viewer__button--secondary viewer__button--small motor-help-overlay__close';
  closeButton.textContent = 'Close';

  header.appendChild(title);
  header.appendChild(closeButton);

  const shortcutsSection = doc.createElement('section');
  const shortcutsTitle = doc.createElement('h3');
  shortcutsTitle.className = 'motor-help-overlay__section-title';
  shortcutsTitle.textContent = 'Keyboard shortcuts';
  shortcutsSection.appendChild(shortcutsTitle);
  shortcutsSection.appendChild(createList(doc, HOTKEYS));

  const gesturesSection = doc.createElement('section');
  const gesturesTitle = doc.createElement('h3');
  gesturesTitle.className = 'motor-help-overlay__section-title';
  gesturesTitle.textContent = 'Gestures & pointers';
  gesturesSection.appendChild(gesturesTitle);
  gesturesSection.appendChild(createList(doc, GESTURES));

  const footer = doc.createElement('p');
  footer.className = 'motor-help-overlay__footer';
  footer.textContent = 'Tip: Press ? (Shift + /) anywhere outside of text fields to reopen this help.';

  dialog.appendChild(header);
  dialog.appendChild(shortcutsSection);
  dialog.appendChild(gesturesSection);
  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  options.root.appendChild(overlay);

  const trigger = options.trigger ?? null;
  if (trigger) {
    trigger.setAttribute('aria-controls', dialog.id);
    trigger.setAttribute('aria-expanded', 'false');
  }

  let isOpen = false;
  let lastFocused: HTMLElement | null = null;

  const getFocusable = (): HTMLElement[] => {
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
    );
  };

  const focusFirst = () => {
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialog.focus();
    }
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    overlay.dataset.state = 'visible';
    overlay.setAttribute('aria-hidden', 'false');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'true');
    }
    const active = doc.activeElement;
    lastFocused = isHTMLElement(active) ? active : null;
    focusFirst();
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    overlay.dataset.state = 'hidden';
    overlay.setAttribute('aria-hidden', 'true');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
    const focusTarget =
      (lastFocused && lastFocused.isConnected ? lastFocused : null) ??
      (trigger && trigger.isConnected ? trigger : null);
    lastFocused = null;
    if (focusTarget) {
      focusTarget.focus();
    }
  };

  const handleTriggerClick = (event: Event) => {
    event.preventDefault();
    if (isOpen) {
      focusFirst();
      return;
    }
    open();
  };

  const handleOverlayClick = (event: MouseEvent) => {
    if (event.target === overlay) {
      close();
    }
  };

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Tab') {
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const activeElement = doc.activeElement;
      const index = focusable.indexOf(activeElement as HTMLElement);
      let nextIndex = index;
      if (event.shiftKey) {
        nextIndex = index <= 0 ? focusable.length - 1 : index - 1;
      } else {
        nextIndex = index === focusable.length - 1 ? 0 : index + 1;
      }
      event.preventDefault();
      focusable[nextIndex].focus();
    }
  };

  const handleDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      close();
      return;
    }

    const key = event.key;
    const wantsHelp = key === '?' || (key === '/' && event.shiftKey);
    if (!wantsHelp) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    event.preventDefault();
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  const handleCloseClick = (event: Event) => {
    event.preventDefault();
    close();
  };

  trigger?.addEventListener('click', handleTriggerClick);
  closeButton.addEventListener('click', handleCloseClick);
  overlay.addEventListener('click', handleOverlayClick);
  dialog.addEventListener('keydown', handleDialogKeydown);
  doc.addEventListener('keydown', handleDocumentKeydown);
  options.root.addEventListener('keydown', handleDocumentKeydown);
  const testingHooks = options.root as HTMLElement & {
    __motorHelpKeydown?: (event: KeyboardEvent) => void;
  };
  testingHooks.__motorHelpKeydown = handleDocumentKeydown;

  return {
    element: overlay,
    open,
    close,
    destroy: () => {
      close();
      trigger?.removeEventListener('click', handleTriggerClick);
      closeButton.removeEventListener('click', handleCloseClick);
      overlay.removeEventListener('click', handleOverlayClick);
      dialog.removeEventListener('keydown', handleDialogKeydown);
      doc.removeEventListener('keydown', handleDocumentKeydown);
      options.root.removeEventListener('keydown', handleDocumentKeydown);
      if ('__motorHelpKeydown' in testingHooks) {
        delete testingHooks.__motorHelpKeydown;
      }
      overlay.remove();
    },
  };
}
