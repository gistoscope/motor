import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeTypedMock } from './testUtils';

import { wireUnarySign } from '../events.unary.js';
import { suggestUnaryRule, toEngineFocus } from '../adapter.unary.js';
import {
  UnaryKind,
  classifyMinus,
  focusForUnary,
  hostOfVirtual,
  isVirtual,
  makeMagId,
  makeSignId,
} from '../unary.js';
import type { AST, NodeId } from '../types.js';

const AST_ATTRIBUTE = 'data-ast-id';

const unaryAst: AST = {
  sequence: ['minus', 'magnitude'],
  tokens: {
    minus: { id: 'minus', text: '-', role: 'operator' },
    magnitude: { id: 'magnitude', text: '2', role: 'literal' },
  },
};

describe('unary utilities', () => {
  it('classifies a leading minus as unary', () => {
    expect(classifyMinus(unaryAst, 'minus')).toBe('UnaryMinus' satisfies UnaryKind);
  });

  it('produces virtual identifiers for sign and magnitude and recovers host', () => {
    const signId = makeSignId('minus');
    const magId = makeMagId('minus');

    expect(signId).toBe('minus::sign');
    expect(magId).toBe('minus::mag');
    expect(isVirtual(signId)).toBe(true);
    expect(isVirtual(magId)).toBe(true);
    expect(hostOfVirtual(signId)).toBe('minus');
    expect(hostOfVirtual(magId)).toBe('minus');
  });

  it('provides a signed span including the neighboring magnitude when available', () => {
    const focus = focusForUnary(unaryAst, 'minus');
    expect(focus.signedSpan).toEqual(['minus', 'magnitude']);
  });
});

describe('wireUnarySign', () => {
  let root: HTMLElement;
  let token: HTMLElement;
  let currentSelection: NodeId[];
  let execMock: ReturnType<typeof makeTypedMock<(focus: NodeId[]) => void>>;
  let getAstMock: ReturnType<typeof makeTypedMock<() => AST>>;
  let getSelectionMock: ReturnType<typeof makeTypedMock<() => NodeId[]>>;
  let setSelectionMock: ReturnType<typeof makeTypedMock<(ids: NodeId[]) => void>>;

  beforeEach(() => {
    execMock = makeTypedMock<(focus: NodeId[]) => void>(() => undefined);
    getAstMock = makeTypedMock<() => AST>(() => unaryAst);
    getSelectionMock = makeTypedMock<() => NodeId[]>(() => [...currentSelection]);
    setSelectionMock = makeTypedMock<(ids: NodeId[]) => void>((ids) => {
      currentSelection = [...ids];
    });
    root = document.createElement('div');
    token = document.createElement('span');
    token.setAttribute(AST_ATTRIBUTE, 'minus');
    token.textContent = '-';
    root.appendChild(token);
    currentSelection = [];
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
  });

  it('toggles between sign-only and full signed atom selection on repeated clicks', () => {
    const detach = wireUnarySign(root, {
      getAst: getAstMock.fn,
      getSelection: getSelectionMock.fn,
      setSelection: setSelectionMock.fn,
      exec: execMock.fn,
    });

    token.click();
    expect(getAstMock.mock.mock.calls).toHaveLength(1);
    expect(setSelectionMock.mock.mock.calls.at(-1)?.[0]).toEqual([makeSignId('minus')]);
    expect(currentSelection).toEqual([makeSignId('minus')]);

    token.click();
    expect(setSelectionMock.mock.mock.calls.at(-1)?.[0]).toEqual(['minus', 'magnitude']);
    expect(currentSelection).toEqual(['minus', 'magnitude']);

    detach();
  });

  it('executes unary action on double click', () => {
    const detach = wireUnarySign(root, {
      getAst: getAstMock.fn,
      getSelection: getSelectionMock.fn,
      setSelection: setSelectionMock.fn,
      exec: execMock.fn,
    });

    token.click();
    token.click();
    token.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(setSelectionMock.mock).toHaveBeenCalled();
    expect(execMock.mock.mock.calls.at(-1)?.[0]).toEqual(['minus', 'magnitude']);

    detach();
  });
});

describe('adapter.unary', () => {
  it('maps virtual sign focus back to the host node id', () => {
    const signId = makeSignId('minus');
    const focus = toEngineFocus(unaryAst, [signId, 'magnitude']);
    expect(focus).toEqual(['minus', 'magnitude']);
  });

  it('suggests negate rule for unary minus focus', () => {
    const rule = suggestUnaryRule(unaryAst, [makeSignId('minus')]);
    expect(rule).toBe('negate');
  });
});
