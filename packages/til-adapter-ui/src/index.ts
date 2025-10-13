import type { Intent, SelectionOption, Trace } from "@til/core";

export interface UiAdapterContext {
  readonly intent: Intent;
  readonly trace?: Trace;
}

export interface UiAdapter {
  readonly name: string;
  readonly version: string;
  presentSelections(context: UiAdapterContext, selections: readonly SelectionOption[]): Promise<void> | void;
  presentError?(error: unknown): Promise<void> | void;
}
