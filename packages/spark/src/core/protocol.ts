export type SelectionValue = string;
export type SelectionInput = SelectionValue | null;

export interface SelectCommand {
  readonly type: 'select';
  readonly selection: SelectionValue;
}

export interface HintCommand {
  readonly type: 'hint';
  readonly message: string;
}

export interface PreviewCommand {
  readonly type: 'preview';
  readonly selection: SelectionInput;
}

export interface ApplyCommand {
  readonly type: 'apply';
}

export interface UndoCommand {
  readonly type: 'undo';
}

export interface RedoCommand {
  readonly type: 'redo';
}

export type SparkCommand =
  | SelectCommand
  | HintCommand
  | PreviewCommand
  | ApplyCommand
  | UndoCommand
  | RedoCommand;

export interface SparkState {
  readonly selection: SelectionInput;
  readonly preview: SelectionInput;
  readonly lastHint: string | null;
}

export interface SelectionChangedEvent {
  readonly type: 'selection.changed';
  readonly selection: SelectionValue;
}

export interface HintProvidedEvent {
  readonly type: 'hint.provided';
  readonly message: string;
}

export interface PreviewChangedEvent {
  readonly type: 'preview.changed';
  readonly selection: SelectionInput;
}

export interface SparkError {
  readonly kind: 'UNIMPL' | 'INVALID_COMMAND';
  readonly message: string;
}

export interface ErrorEvent {
  readonly type: 'error';
  readonly error: SparkError;
  readonly command: SparkCommand;
}

export type SparkEvent =
  | SelectionChangedEvent
  | HintProvidedEvent
  | PreviewChangedEvent
  | ErrorEvent;

export interface SparkSnapshot extends SparkState {
  readonly history: ReadonlyArray<SparkEvent>;
}
