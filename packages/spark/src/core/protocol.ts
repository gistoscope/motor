export type SparkSelectionTarget =
  | { kind: 'token'; value: string }
  | { kind: 'range'; start: number; end: number }
  | { kind: 'pair'; left: string; right: string };

export interface SparkStep {
  id: string;
  label: string;
  description?: string;
}

export interface SparkHistoryEntry {
  stepId: string;
  appliedAt: number;
}

export interface SparkPreview {
  stepId: string;
}

export interface SparkState {
  ast: unknown;
  selection: SparkSelectionTarget | null;
  availableSteps: SparkStep[];
  history: SparkHistoryEntry[];
  preview?: SparkPreview;
}

export type SelectCommand = {
  type: 'Select';
  target: SparkSelectionTarget;
};

export type ApplyCommand = {
  type: 'Apply';
  stepId: string;
};

export type UndoCommand = { type: 'Undo' };
export type RedoCommand = { type: 'Redo' };

export type HintCommand = { type: 'Hint' };

export type PreviewCommand = {
  type: 'Preview';
  stepId: string;
};

export type SparkCommand =
  | SelectCommand
  | ApplyCommand
  | UndoCommand
  | RedoCommand
  | HintCommand
  | PreviewCommand;

export type StateChangedEvent = {
  type: 'StateChanged';
  state: SparkState;
};

export type StepSuggestedEvent = {
  type: 'StepSuggested';
  steps: SparkStep[];
};

export type StepAppliedEvent = {
  type: 'StepApplied';
  stepId: string;
};

export type HoverChangedEvent = {
  type: 'HoverChanged';
  range: SparkSelectionTarget | null;
};

export interface SparkError {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

export type ErrorEvent = {
  type: 'Error';
  error: SparkError;
};

export type SparkEvent =
  | StateChangedEvent
  | StepSuggestedEvent
  | StepAppliedEvent
  | HoverChangedEvent
  | ErrorEvent;

export type SparkListener = (event: SparkEvent) => void;

export interface SparkController {
  dispatch: (command: SparkCommand) => void;
  subscribe: (listener: SparkListener) => () => void;
  getState: () => SparkState;
}
