import { protocolVersion } from "./types";
import type { SelectionOption, TilError } from "./types";

const FALLBACK_TIMESTAMP = "1970-01-01T00:00:00.000Z" as const;

export interface CreateTilErrorInput {
  readonly code: string;
  readonly message: string;
  readonly hint?: string;
  readonly nextSelections?: readonly SelectionOption[];
  readonly id?: string;
  readonly createdAt?: string;
}

export const ERROR_CODE_PATTERN = /^[A-Z0-9_]+(?:\/[A-Z0-9_]+)*$/u;

export function normalizeErrorCode(rawCode: string): string {
  const sanitized = rawCode
    .split("/")
    .map((segment) =>
      segment
        .trim()
        .replace(/[^a-zA-Z0-9]+/gu, "_")
        .replace(/_+/gu, "_")
        .replace(/^_+|_+$/gu, "")
        .toUpperCase(),
    )
    .filter((segment) => segment.length > 0)
    .join("/");

  const normalized = sanitized.length > 0 ? sanitized : "UNKNOWN";

  return ERROR_CODE_PATTERN.test(normalized) ? normalized : "UNKNOWN";
}

export function createTilError(input: CreateTilErrorInput): TilError {
  const code = normalizeErrorCode(input.code);
  const nextSelections = input.nextSelections?.map((selection) => {
    const normalized: SelectionOption = {
      id: selection.id,
      title: selection.title,
    };

    if (selection.description !== undefined) {
      normalized.description = selection.description;
    }

    return normalized;
  });

  const error: TilError = {
    protocolVersion,
    type: "error",
    id: input.id ?? code,
    createdAt: input.createdAt ?? FALLBACK_TIMESTAMP,
    code,
    message: input.message,
  };

  if (input.hint) {
    error.hint = input.hint;
  }

  if (nextSelections && nextSelections.length > 0) {
    error.nextSelections = nextSelections;
  }

  return error;
}
