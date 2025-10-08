import { NodeId } from './types';

type HoverCallback = (id: NodeId | null, event: MouseEvent) => void;
type SelectCallback = (id: NodeId, event: MouseEvent) => void;
type KeyDownCallback = (event: KeyboardEvent, id: NodeId | null) => void;

export type EventCallbacks = {
  onHover?: HoverCallback;
  onSelect?: SelectCallback;
  onKeyDown?: KeyDownCallback;
};

const AST_ATTRIBUTE = 'data-ast-id';

function getNodeIdFromTarget(target: EventTarget | null): NodeId | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const element = target.closest(`[${AST_ATTRIBUTE}]`);
  if (!element) {
    return null;
  }

  const value = element.getAttribute(AST_ATTRIBUTE);
  return value ?? null;
}

export function attachEventDelegates(
  container: HTMLElement,
  callbacks: EventCallbacks,
): () => void {
  const handleMouseOver = (event: MouseEvent) => {
    const id = getNodeIdFromTarget(event.target);
    if (!id) {
      return;
    }

    callbacks.onHover?.(id, event);
  };

  const handleMouseOut = (event: MouseEvent) => {
    callbacks.onHover?.(null, event);
  };

  const handleClick = (event: MouseEvent) => {
    const id = getNodeIdFromTarget(event.target);
    if (!id) {
      return;
    }

    callbacks.onSelect?.(id, event);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const id = getNodeIdFromTarget(event.target);
    callbacks.onKeyDown?.(event, id);
  };

  container.addEventListener('mouseover', handleMouseOver);
  container.addEventListener('mouseout', handleMouseOut);
  container.addEventListener('click', handleClick);
  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('mouseover', handleMouseOver);
    container.removeEventListener('mouseout', handleMouseOut);
    container.removeEventListener('click', handleClick);
    container.removeEventListener('keydown', handleKeyDown);
  };
}
