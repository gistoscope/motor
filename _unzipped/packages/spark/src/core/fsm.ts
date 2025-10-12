import {
  HintCommand,
  PreviewCommand,
  SelectCommand,
  SparkCommand,
  SparkController,
  SparkEvent,
  SparkListener,
  SparkState,
  SparkStep,
} from './protocol.js';

const DEFAULT_STATE: SparkState = {
  ast: null,
  selection: null,
  availableSteps: [],
  history: [],
};

function cloneState(state: SparkState): SparkState {
  return {
    ast: state.ast,
    selection: state.selection ? { ...state.selection } : null,
    availableSteps: state.availableSteps.map((step) => ({ ...step })),
    history: state.history.map((entry) => ({ ...entry })),
    preview: state.preview ? { ...state.preview } : undefined,
  };
}

function computeAvailableSteps(selection: SelectCommand['target'] | null): SparkStep[] {
  if (!selection) return [];
  return [
    { id: 'simplify', label: 'Simplify' },
    { id: 'factor', label: 'Factor' },
  ];
}

function emit(listeners: Set<SparkListener>, event: SparkEvent) {
  for (const listener of listeners) listener(event);
}

export function createSpark(initial: Partial<SparkState> = {}): SparkController {
  let currentState: SparkState = {
    ...cloneState(DEFAULT_STATE),
    ...initial,
    availableSteps: initial.availableSteps?.map((s) => ({ ...s })) ?? [],
    history: initial.history?.map((h) => ({ ...h })) ?? [],
  };

  const listeners = new Set<SparkListener>();

  const controller: SparkController = {
    dispatch(command: SparkCommand) {
      switch (command.type) {
        case 'Select': {
          const steps = computeAvailableSteps(command.target);
          currentState = {
            ...currentState,
            selection: { ...command.target },
            availableSteps: steps,
            preview: undefined,
          };
          emit(listeners, { type: 'StateChanged', state: cloneState(currentState) });
          if (steps.length > 0) {
            emit(listeners, { type: 'StepSuggested', steps: steps.map((s) => ({ ...s })) });
          }
          break;
        }
        case 'Hint': {
          const _ = command as HintCommand;
          const steps = computeAvailableSteps(currentState.selection);
          if (steps.length > 0) {
            emit(listeners, { type: 'StepSuggested', steps: steps.map((s) => ({ ...s })) });
          } else {
            emit(listeners, { type: 'Error', error: { code: 'NO_STEPS', message: 'No steps available for hint.' } });
          }
          break;
        }
        case 'Preview': {
          const previewCommand = command as PreviewCommand;
          const step = currentState.availableSteps.find((i) => i.id === previewCommand.stepId);
          if (!step) {
            emit(listeners, {
              type: 'Error',
              error: { code: 'STEP_UNKNOWN', message: `Step not available for preview: ${previewCommand.stepId}` },
            });
            break;
          }
          currentState = { ...currentState, preview: { stepId: previewCommand.stepId } };
          emit(listeners, { type: 'StateChanged', state: cloneState(currentState) });
          break;
        }
        case 'Apply':
        case 'Undo':
        case 'Redo': {
          emit(listeners, {
            type: 'Error',
            error: { code: 'UNIMPL', message: `Not implemented: ${command.type}`, meta: { command } },
          });
          break;
        }
        default: {
          const neverCommand: never = command;
          emit(listeners, { type: 'Error', error: { code: 'UNKNOWN_COMMAND', message: `Unknown command ${(neverCommand as { type: string }).type}` } });
        }
      }
    },
    subscribe(listener: SparkListener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getState() { return cloneState(currentState); },
  };

  return controller;
}
