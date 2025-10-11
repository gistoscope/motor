import { NodeId } from './types.js';

export type SelectionState = {
  hoverId: NodeId | null;
  selectedIds: NodeId[];
};

const state: SelectionState = {
  hoverId: null,
  selectedIds: [],
};

export function select(ids: NodeId[]): void {
  state.selectedIds = [...ids];
}

export function hover(id: NodeId | null): void {
  state.hoverId = id;
}

export function clear(): void {
  state.hoverId = null;
  state.selectedIds = [];
}

export function get(): SelectionState {
  return {
    hoverId: state.hoverId,
    selectedIds: [...state.selectedIds],
  };
}
