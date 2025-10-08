import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeTypedMock } from './testUtils';

type NodeId = string;
type AST = any;
type TILOptions = {
  getPairMap?: () => Map<NodeId, NodeId> | null;
  onFocusChange?: (ids: NodeId[]) => void;
  onAction?: (payload: any) => void;
};
type TILHandle = {
  detach(): void;
  getSelection(): NodeId[];
};

type EventCallbacks = {
  onHover?: (id: NodeId | null, event: MouseEvent) => void;
  onSelect?: (id: NodeId, event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent, id: NodeId | null) => void;
};

type ActionDescriptor = { id: string; label: string };
type CommandContext = {
  selection: NodeId[];
  clearSelection(): void;
  tryAction(): void;
};
type SelectionState = { hoverId: NodeId | null; selectedIds: NodeId[] };

type AttachTIL = (container: HTMLElement, getAst: () => AST, options?: TILOptions) => TILHandle;
let attachTIL: AttachTIL;

type AttachEventDelegates = (container: HTMLElement, callbacks: EventCallbacks) => () => void;
type RegisterPairMap = (getter: (() => Map<NodeId, NodeId> | null) | null) => void;
type ListActions = (focus: NodeId[]) => ActionDescriptor[];
type HandleCommand = (event: KeyboardEvent, context: CommandContext) => void;
type SelectFn = (ids: NodeId[]) => void;
type HoverFn = (id: NodeId | null) => void;
type ClearFn = () => void;
type GetFn = () => SelectionState;
type DetachEvents = () => void;

type TypedMock<F extends (...args: any[]) => any> = ReturnType<typeof makeTypedMock<F>>;

let attachEventDelegatesMock: TypedMock<AttachEventDelegates>;
let registerPairMapMock: TypedMock<RegisterPairMap>;
let listActionsMock: TypedMock<ListActions>;
let handleCommandMock: TypedMock<HandleCommand>;
let selectMock: TypedMock<SelectFn>;
let hoverMock: TypedMock<HoverFn>;
let clearMock: TypedMock<ClearFn>;
let getMock: TypedMock<GetFn>;
let detachEventsMock: TypedMock<DetachEvents>;

const callTypedMock = <F extends (...args: any[]) => any>(mock: TypedMock<F>, ...args: Parameters<F>): ReturnType<F> => {
  return mock.fn(...args);
};

vi.mock('../events', () => ({
  attachEventDelegates: ((...args: Parameters<AttachEventDelegates>) =>
    callTypedMock(attachEventDelegatesMock, ...args)) as AttachEventDelegates,
}));

vi.mock('../pairMap', () => ({
  registerPairMap: ((...args: Parameters<RegisterPairMap>) =>
    callTypedMock(registerPairMapMock, ...args)) as RegisterPairMap,
}));

vi.mock('../adapter', () => ({
  listActions: ((...args: Parameters<ListActions>) => callTypedMock(listActionsMock, ...args)) as ListActions,
}));

vi.mock('../commands', () => ({
  handleCommand: ((...args: Parameters<HandleCommand>) => callTypedMock(handleCommandMock, ...args)) as HandleCommand,
}));

vi.mock('../selectionStore', () => ({
  select: ((...args: Parameters<SelectFn>) => callTypedMock(selectMock, ...args)) as SelectFn,
  hover: ((...args: Parameters<HoverFn>) => callTypedMock(hoverMock, ...args)) as HoverFn,
  clear: ((...args: Parameters<ClearFn>) => callTypedMock(clearMock, ...args)) as ClearFn,
  get: ((...args: Parameters<GetFn>) => callTypedMock(getMock, ...args)) as GetFn,
}));

let lastDelegatedCallbacks: EventCallbacks | undefined;
const selectionState: SelectionState = {
  hoverId: null,
  selectedIds: [],
};

beforeAll(async () => {
  ({ attachTIL } = await import('../index'));
});

beforeEach(() => {
  attachEventDelegatesMock = makeTypedMock<AttachEventDelegates>();
  registerPairMapMock = makeTypedMock<RegisterPairMap>();
  listActionsMock = makeTypedMock<ListActions>();
  handleCommandMock = makeTypedMock<HandleCommand>();
  selectMock = makeTypedMock<SelectFn>();
  hoverMock = makeTypedMock<HoverFn>();
  clearMock = makeTypedMock<ClearFn>();
  getMock = makeTypedMock<GetFn>();
  detachEventsMock = makeTypedMock<DetachEvents>();

  selectionState.hoverId = null;
  selectionState.selectedIds = [];
  lastDelegatedCallbacks = undefined;

  attachEventDelegatesMock.mock.mockImplementation((_, callbacks) => {
    lastDelegatedCallbacks = callbacks;
    return detachEventsMock.fn;
  });

  listActionsMock.mock.mockImplementation(() => []);
  handleCommandMock.mock.mockImplementation(() => undefined);

  selectMock.mock.mockImplementation((ids) => {
    selectionState.selectedIds = [...ids];
    return undefined;
  });

  hoverMock.mock.mockImplementation((id) => {
    selectionState.hoverId = id;
    return undefined;
  });

  clearMock.mock.mockImplementation(() => {
    selectionState.hoverId = null;
    selectionState.selectedIds = [];
    return undefined;
  });

  getMock.mock.mockImplementation(() => ({
    hoverId: selectionState.hoverId,
    selectedIds: [...selectionState.selectedIds],
  }));
});

describe('attachTIL', () => {
  it('registers the pair map and detaches listeners', () => {
    const container = document.createElement('div');
    const fakeAst = { id: 'ast' } as AST;
    const getAst = makeTypedMock<() => AST>(() => fakeAst);
    const pairMapGetter = makeTypedMock<NonNullable<TILOptions['getPairMap']>>(() => new Map());
    const onFocusChange = makeTypedMock<NonNullable<TILOptions['onFocusChange']>>();
    const onAction = makeTypedMock<NonNullable<TILOptions['onAction']>>();

    const handle = attachTIL(container, getAst.fn, {
      getPairMap: pairMapGetter.fn,
      onFocusChange: onFocusChange.fn,
      onAction: onAction.fn,
    });

    expect(registerPairMapMock.mock.mock.calls).toHaveLength(1);
    expect(registerPairMapMock.mock.mock.calls[0][0]).toBe(pairMapGetter.fn);
    expect(attachEventDelegatesMock.mock.mock.calls).toHaveLength(1);
    expect(attachEventDelegatesMock.mock.mock.calls[0][0]).toBe(container);
    expect(lastDelegatedCallbacks).toBeDefined();

    selectionState.selectedIds = ['node-1'];
    expect(handle.getSelection()).toEqual(['node-1']);
    expect(getMock.mock.mock.calls).toHaveLength(1);

    handle.detach();

    expect(detachEventsMock.mock).toHaveBeenCalledTimes(1);
    expect(registerPairMapMock.mock.mock.calls.at(-1)?.[0]).toBeNull();
    expect(clearMock.mock).toHaveBeenCalledTimes(1);
  });

  it('updates hover and selection state through delegated mouse events', () => {
    const container = document.createElement('div');
    const getAst = makeTypedMock<() => AST>(() => ({} as AST));
    const onFocusChange = makeTypedMock<NonNullable<TILOptions['onFocusChange']>>();

    attachTIL(container, getAst.fn, {
      onFocusChange: onFocusChange.fn,
    });

    expect(lastDelegatedCallbacks).toBeDefined();
    const callbacks = lastDelegatedCallbacks!;

    callbacks.onHover?.('hover-node' satisfies NodeId, new MouseEvent('mouseover'));
    expect(hoverMock.mock).toHaveBeenLastCalledWith('hover-node');

    const preventDefault = vi.fn();
    const selectEvent = { preventDefault } as unknown as MouseEvent;
    callbacks.onSelect?.('selected-node' satisfies NodeId, selectEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(selectMock.mock).toHaveBeenLastCalledWith(['selected-node']);
    expect(onFocusChange.mock).toHaveBeenLastCalledWith(['selected-node']);
  });

  it('exposes command context that can clear and apply actions', () => {
    const container = document.createElement('div');
    const fakeAst = { kind: 'fake' } as AST;
    const getAst = makeTypedMock<() => AST>(() => fakeAst);
    const onFocusChange = makeTypedMock<NonNullable<TILOptions['onFocusChange']>>();
    const onAction = makeTypedMock<NonNullable<TILOptions['onAction']>>();

    attachTIL(container, getAst.fn, {
      onFocusChange: onFocusChange.fn,
      onAction: onAction.fn,
    });

    expect(lastDelegatedCallbacks).toBeDefined();
    const callbacks = lastDelegatedCallbacks!;

    selectionState.selectedIds = ['initial-selection'];
    const keyEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    callbacks.onKeyDown?.(keyEvent, 'initial-selection');

    expect(handleCommandMock.mock.mock.calls).toHaveLength(1);
    const [, context] = handleCommandMock.mock.mock.calls[0];
    expect(context.selection).toEqual(['initial-selection']);

    const action = { id: 'rule', label: 'Rule' };
    listActionsMock.mock.mockImplementation(() => [action]);
    selectionState.selectedIds = ['node-42'];

    context.tryAction();

    expect(listActionsMock.mock.mock.calls.at(-1)?.[0]).toEqual(['node-42']);
    expect(getAst.mock).toHaveBeenCalledTimes(1);
    expect(onAction.mock).toHaveBeenLastCalledWith({
      action,
      selection: ['node-42'],
    });

    context.clearSelection();

    expect(clearMock.mock).toHaveBeenCalledTimes(1);
    expect(onFocusChange.mock).toHaveBeenLastCalledWith([]);
  });
});
