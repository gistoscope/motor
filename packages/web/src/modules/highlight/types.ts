export type HighlightId = string;

export type HighlightRole = 'token' | 'bracket' | 'operator';

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export interface HighlightRenderItem {
  id: HighlightId;
  rect: HighlightRect;
  role: HighlightRole;
  intensity: number;
  accent: 'primary' | 'muted';
  activatedAt: number;
  bracketGroup?: string;
}

export interface HighlightTether {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  activatedAt: number;
}

export interface HighlightSnapshot {
  items: HighlightRenderItem[];
  tethers: HighlightTether[];
  activeIds: HighlightId[];
}

export interface HighlightRegistrationOptions {
  id: HighlightId;
  role?: HighlightRole;
  bracketGroup?: string;
  accent?: 'primary' | 'muted';
  padding?: number;
}

export interface HighlightControllerLike {
  register(element: HTMLElement, options: HighlightRegistrationOptions): () => void;
  highlight(ids: HighlightId[], intensity?: number): void;
  pulse(ids: HighlightId[], intensity?: number): void;
  clear(ids?: HighlightId[]): void;
  setHost(element: HTMLElement | null): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): HighlightSnapshot;
}
