import { protocolVersion, type NextSelection, type TilError } from "./types.js";

const FALLBACK_TIMESTAMP = "1970-01-01T00:00:00.000Z" as const;
const FALLBACK_ERROR_CODE = "UNKNOWN" as const;

function normaliseSegment(segment: string): string | undefined {
  const cleaned = segment
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.toUpperCase())
    .join("_");

  return cleaned.length > 0 ? cleaned : undefined;
}

export function normalizeErrorCode(raw: string): string {
  if (!raw) {
    return FALLBACK_ERROR_CODE;
  }

  const segments = raw
    .split("/")
    .map((segment) => normaliseSegment(segment))
    .filter((segment): segment is string => typeof segment === "string");

  if (segments.length === 0) {
    return FALLBACK_ERROR_CODE;
  }

  return segments.join("/");
}

export interface CreateTilErrorArgs {
  code: string;
  message: string;
  hint?: string;
  nextSelections?: NextSelection[];
  id?: string;
  createdAt?: string;
}

export function createTilError(args: CreateTilErrorArgs): TilError {
  const normalizedCode = normalizeErrorCode(args.code);
  const nextSelections = args.nextSelections?.map((selection) => ({
    id: selection.id,
    title: selection.title,
    description: selection.description
  }));

  return {
    protocolVersion,
    id: args.id ?? normalizedCode,
    createdAt: args.createdAt ?? FALLBACK_TIMESTAMP,
    code: normalizedCode,
    message: args.message,
    hint: args.hint,
    nextSelections
  };
}
