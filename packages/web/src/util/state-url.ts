const OVERLAY_NAMES = ["scc", "cycles", "shortest"] as const;

export type OverlayName = (typeof OVERLAY_NAMES)[number];

export type OverlaySelection = Record<OverlayName, boolean>;

export interface ViewerUrlState {
  expression: string;
  overlays: OverlaySelection;
  scale: number;
}

const DEFAULT_OVERLAYS: OverlaySelection = Object.freeze({
  scc: false,
  cycles: false,
  shortest: false,
});

export const DEFAULT_VIEWER_URL_STATE: ViewerUrlState = {
  expression: "",
  overlays: { ...DEFAULT_OVERLAYS },
  scale: 1,
};

const PARAM_EXPRESSION = "expr";
const PARAM_OVERLAY = "ov";
const PARAM_SCALE = "sc";

const SCALE_PRECISION = 1000;
const SCALE_MIN = 0.01;
const SCALE_MAX = 100;

function createOverlaySelection(partial?: Partial<Record<OverlayName, boolean>>): OverlaySelection {
  return {
    scc: Boolean(partial?.scc),
    cycles: Boolean(partial?.cycles),
    shortest: Boolean(partial?.shortest),
  };
}

function cloneDefaultOverlays(): OverlaySelection {
  return createOverlaySelection(DEFAULT_OVERLAYS);
}

function normalizeScale(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_VIEWER_URL_STATE.scale;
  }
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, parsed));
  return Math.round(clamped * SCALE_PRECISION) / SCALE_PRECISION;
}

function formatScale(value: number): string {
  const rounded = Math.round(value * SCALE_PRECISION) / SCALE_PRECISION;
  return Number(rounded.toFixed(3)).toString();
}

function toSearchParams(source?: string | URL | URLSearchParams | null): URLSearchParams {
  if (source instanceof URLSearchParams) {
    return source;
  }
  if (source instanceof URL) {
    return source.searchParams;
  }
  if (typeof source === "string") {
    const trimmed = source.startsWith("?") ? source.slice(1) : source;
    return new URLSearchParams(trimmed);
  }
  if (typeof window !== "undefined" && source == null) {
    return new URLSearchParams(window.location.search);
  }
  return new URLSearchParams();
}

function parseOverlays(value: string | null): OverlaySelection {
  const result = cloneDefaultOverlays();
  if (!value) {
    return result;
  }
  value
    .split(",")
    .map((token) => token.trim())
    .filter((token): token is OverlayName => (OVERLAY_NAMES as readonly string[]).includes(token))
    .forEach((token) => {
      result[token] = true;
    });
  return result;
}

function parseScale(value: string | null): number {
  if (!value) {
    return DEFAULT_VIEWER_URL_STATE.scale;
  }
  return normalizeScale(value);
}

export function decodeViewerStateFromSearch(
  source?: string | URL | URLSearchParams | null,
): ViewerUrlState {
  const params = toSearchParams(source);
  const expression = params.get(PARAM_EXPRESSION) ?? DEFAULT_VIEWER_URL_STATE.expression;
  const overlays = parseOverlays(params.get(PARAM_OVERLAY));
  const scale = parseScale(params.get(PARAM_SCALE));
  return { expression, overlays, scale };
}

export function encodeViewerStateToSearch(state: ViewerUrlState): string {
  const params = new URLSearchParams();
  if (state.expression) {
    params.set(PARAM_EXPRESSION, state.expression);
  }
  const overlayList = OVERLAY_NAMES.filter((name) => state.overlays[name]);
  if (overlayList.length > 0) {
    params.set(PARAM_OVERLAY, overlayList.join(","));
  }
  const normalizedScale = normalizeScale(state.scale);
  if (normalizedScale !== DEFAULT_VIEWER_URL_STATE.scale) {
    params.set(PARAM_SCALE, formatScale(normalizedScale));
  }
  return params.toString();
}

export function encodeViewerStateToUrl(
  state: ViewerUrlState,
  base?: string | URL,
): string {
  const search = encodeViewerStateToSearch(state);
  const url = (() => {
    if (base) {
      return new URL(base.toString());
    }
    if (typeof window !== "undefined" && window.location) {
      return new URL(window.location.href);
    }
    return new URL("https://local.invalid/");
  })();
  url.search = search;
  return url.toString();
}
