export type GraspId = string & { readonly brand: 'GraspId' };

export interface GraspNode {
  id: GraspId;
  label: string;
}

export interface GraspEdge {
  from: GraspId;
  to: GraspId;
  label?: string;
}
