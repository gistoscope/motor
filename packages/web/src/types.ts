export interface GraphNode {
  readonly id: string;
  readonly label?: string;
}

export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly label?: string;
  readonly weight?: number;
}

export interface GraphJSON {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
  readonly name?: string;
}

export interface GraphValidationSuccess {
  readonly ok: true;
  readonly errors: readonly string[];
  readonly graph: GraphJSON;
}

export interface GraphValidationFailure {
  readonly ok: false;
  readonly errors: readonly string[];
}

export type GraphValidationResult = GraphValidationSuccess | GraphValidationFailure;

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
