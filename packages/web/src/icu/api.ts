export type TokenId = string;
export type RegionId = string;

export interface ASTNodeRef { readonly __brand: 'ASTNodeRef'; id: string; }

export type NavigationMode = 'structural'|'horizontal'|'semantic';
export type NavigationCommand = 'expand'|'contract'|'next'|'prev';

export interface SemanticNavigator {
  fromTok(tok: TokenId): ASTNodeRef | null;
  toToks(node: ASTNodeRef): TokenId[];
  navigate(from: ASTNodeRef, cmd: NavigationCommand, mode: NavigationMode): ASTNodeRef[];
  getGroupFor(node: ASTNodeRef, kind: 'term'|'factor'|'fraction'|'sum'|'product'|'power'|'numerator'|'denominator'): ASTNodeRef[] | null;
}

export interface BracketPair { open: TokenId; close: TokenId; level: number; content: ASTNodeRef[]; implicit: boolean; }
export interface BracketService { getHierarchy(tok: TokenId): BracketPair[]; }

export interface VisualSelection { regionId: RegionId; tokIds: TokenId[]; }
export interface SemanticSelection { regionId: RegionId; nodes: ASTNodeRef[]; kind: 'token'|'group'|'bracket-pair'; }

export interface SelectionUnit {
  regionId: RegionId;
  visual: VisualSelection;
  semantic: SemanticSelection;
  focus: boolean;
  styleIndex: number;
}

export interface SelectionState { regions: SelectionUnit[]; focusIndex: number | null; }

export interface InteractionProfile {
  leftClick: 'select-token'|'select-bracket-pair'|'noop';
  doubleClick: 'promote-group'|'select-parent'|'noop';
  rightClick: 'context-menu'|'noop';
  clickDrag: 'semantic-range'|'lasso'|'noop';
  hover: 'highlight'|'noop';
  keyboard?: {
    escapeClears: boolean;
    arrows: 'navigate-tokens'|'navigate-regions'|'noop';
    tabMoves: boolean;
    ctrlArrowsAST: boolean;
    homeEndInGroup: boolean;
    ctrlSpaceMenu: boolean;
    shiftAddsRegion: boolean;
    ctrlTogglesRegion: boolean;
  };
  maxRegions?: number;
}

export interface PerformanceProfile {
  tokenCacheStrategy: 'lru'|'full'|'none';
  maxCachedGroups: number;
  asyncGroupLookup: boolean;
  virtualizeOnTokenCount: number;
  budgets: { hoverMs: number; clickSelectMs: number; dragUpdateMs: number; contextMenuMs: number; };
}

export type I18nMathTerms = Record<'numerator'|'denominator'|'factor'|'term'|'sum'|'product'|'power', string>;
export interface A11yConfig {
  announceSelection: boolean; announceOperation: boolean; announceResult: boolean;
  landmarkRoles: boolean; highContrast: boolean; focusIndicatorWidth: number; selectionOpacity: number;
}

export interface InstallOptions {
  doc: Document;
  findRoot: () => Element | null;
  navigator: SemanticNavigator;
  brackets: BracketService;
  profile?: InteractionProfile;
  perf?: PerformanceProfile;
  i18n?: I18nMathTerms;
  a11y?: A11yConfig;
  onHoverChange?: (tok: TokenId | null) => void;
  onSelectionChange?: (state: SelectionState) => void;
  onActionRequest?: (req: { action: string; regions: SelectionUnit[]; options?: Record<string, unknown> }) => void;
}

export interface ICUInstance { dispose(): void; }
