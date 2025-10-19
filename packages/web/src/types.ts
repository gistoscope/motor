export interface GraphNode {
  readonly id: string;
  readonly label?: string;
  readonly type?: string;
  readonly data?: Record<string, unknown>;
}

export interface GraphEdge {
  readonly id?: string;
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly weight?: number;
  readonly type?: string;
  readonly data?: Record<string, unknown>;
}

export interface GraphJSON {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly meta?: Record<string, unknown>;
}

export interface GraphValidationResult {
  readonly ok: boolean;
  readonly errors?: string[];
}

export interface GraspModule {
  validateGraphJSON(value: unknown): GraphValidationResult;
  fromJSON(graph: GraphJSON): unknown;
  toDOT(graph: unknown): string;
  inspect(graph: unknown): string;
}

export interface TsaModule {
  listActions(ast: StageAst, focus: readonly string[]): string[];
  canApply(ast: StageAst, rule: string, focus: readonly string[]): boolean;
  applyOne(
    ast: StageAst,
    rule: string,
    focus: readonly string[],
  ): { ok: true; ast: StageAst } | { ok: false; reason?: string };
  applyNextRule?(ast: StageAst, rule?: string): { ast: StageAst; rule: string; rationale: string[] } | null;
  formatStage2?(ast: StageAst): string;
  evaluateExpression?(ast: StageAst): { value: unknown } | { error: string };
  formatRational?(value: unknown): string;
  parseStage2Expression?(source: string): StageAst | { error: string };
}

export type StageAst = unknown;
