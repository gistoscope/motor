export const makeDomId = (viewId: string, logicalId: string) => `gv:${viewId}:${logicalId}`;
export const parseDomId = (id: string) => {
  const m = /^gv:([^:]+):(.*)$/.exec(id);
  return m ? { viewId: m[1], logicalId: m[2] } : null;
};
export type TargetKind = 'node'|'edge'|'token'|'bracketPair'|'operator'|'fracBar';
export type Target = { kind: TargetKind; id: string };
