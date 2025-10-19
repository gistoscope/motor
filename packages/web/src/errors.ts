export type WebWarningCode = 'WEB.E3.NEGATIVE_WEIGHT' | 'WEB.E4.NO_PATH';

export type WebErrorCode = 'WEB.E0.WORKER_INIT';

const WARNING_MESSAGES: Record<WebWarningCode, string> = {
  'WEB.E3.NEGATIVE_WEIGHT': 'Negative edge weights are not supported for shortest paths.',
  'WEB.E4.NO_PATH': 'No path exists between the selected nodes.',
};

const ERROR_MESSAGES: Record<WebErrorCode, string> = {
  'WEB.E0.WORKER_INIT': 'Falling back to synchronous analysis; the worker could not be initialized.',
};

export function getWarningMessage(code: WebWarningCode): string {
  return WARNING_MESSAGES[code] ?? 'Unknown warning';
}

export function getErrorMessage(code: WebErrorCode): string {
  return ERROR_MESSAGES[code] ?? 'Unknown error';
}
