import type {
  HintCommand,
  PreviewCommand,
  SelectCommand,
  SparkCommand,
  SparkError,
  SparkEvent,
  SparkState
} from './protocol.js';

export interface PolicyResult {
  readonly state: SparkState;
  readonly events: SparkEvent[];
}

export function applyPolicies(state: SparkState, command: SparkCommand): PolicyResult {
  switch (command.type) {
    case 'select':
      return handleSelect(state, command);
    case 'hint':
      return handleHint(state, command);
    case 'preview':
      return handlePreview(state, command);
    case 'apply':
    case 'undo':
    case 'redo':
      return unimplemented(state, command);
    default:
      return invalid(state, command satisfies never);
  }
}

function handleSelect(state: SparkState, command: SelectCommand): PolicyResult {
  const nextState: SparkState = {
    ...state,
    selection: command.selection
  };

  return {
    state: nextState,
    events: [
      {
        type: 'selection.changed',
        selection: command.selection
      }
    ]
  };
}

function handleHint(state: SparkState, command: HintCommand): PolicyResult {
  const nextState: SparkState = {
    ...state,
    lastHint: command.message
  };

  return {
    state: nextState,
    events: [
      {
        type: 'hint.provided',
        message: command.message
      }
    ]
  };
}

function handlePreview(state: SparkState, command: PreviewCommand): PolicyResult {
  const nextState: SparkState = {
    ...state,
    preview: command.selection
  };

  return {
    state: nextState,
    events: [
      {
        type: 'preview.changed',
        selection: command.selection
      }
    ]
  };
}

function unimplemented(state: SparkState, command: SparkCommand): PolicyResult {
  return error(state, command, {
    kind: 'UNIMPL',
    message: `Command "${command.type}" is not implemented.`
  });
}

function invalid(state: SparkState, command: never): PolicyResult {
  return error(state, command, {
    kind: 'INVALID_COMMAND',
    message: 'Command is not recognised.'
  });
}

function error(state: SparkState, command: SparkCommand, error: SparkError): PolicyResult {
  return {
    state,
    events: [
      {
        type: 'error',
        error,
        command
      }
    ]
  };
}
