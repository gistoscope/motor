import { NodeId } from './types.js';

export type CommandContext = {
  selection: NodeId[];
  clearSelection(): void;
  tryAction(): void;
};

export function handleCommand(event: KeyboardEvent, context: CommandContext): void {
  if (event.defaultPrevented) {
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    context.tryAction();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    context.clearSelection();
  }
}
