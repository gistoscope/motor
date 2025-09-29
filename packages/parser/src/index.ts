
import { AST } from '@motor/core';
import type { Expr } from '@motor/core';
import { print } from '@motor/core';

export { print };
export type { Expr };

type TokType = 'num'|'ident'|'op'|'lpar'|'rpar'|'eof';
type Tok = { t: TokType, v?: string, pos: number };

export class ParseError extends Error {
  constructor(msg:string, public pos:number){ super(`${msg} at ${pos}`); }
}

const isDigit = (c:string)=> c>='0'&&c<='9';
const isAlpha = (c:string)=> /[a-zA-Z_]/.test(c);

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i=0;
  while(i<src.length){
    const c=src[i];
    if (c===' '||c==='\t'||c==='\n'||c==='\r'){ i++; continue; }
    if ('+-*/^'.includes(c)){ out.push({t:'op', v:c, pos:i}); i++; continue; }
    if (c==='('){ out.push({t:'lpar', pos:i}); i++; continue; }
    if (c===')'){ out.push({t:'rpar', pos:i}); i++; continue; }
    if (isDigit(c)){
      const start=i;
      let j=i; while(j<src.length && isDigit(src[j])) j++;
      // If a dot follows immediately, Stage-1 forbids decimals
      if (j<src.length && src[j]==='.') {
        throw new ParseError('Decimal literals are not supported at Stage-1', j);
      }
      const num = src.slice(i,j);
      out.push({t:'num', v:num, pos:start}); i=j; continue;
    }
    if (isAlpha(c)){
      const start=i;
      let j=i; while(j<src.length && isAlpha(src[j])) j++;
      const id = src.slice(i,j);
      out.push({t:'ident', v:id, pos:start}); i=j; continue;
    }
    throw new ParseError(`Unexpected char '${c}'`, i);
  }
  out.push({t:'eof', pos:src.length});
  return out;
}

export function parse(src: string): Expr {
  const toks = tokenize(src);
  let i=0;
  const peek = ()=> toks[i];
  const take = ()=> toks[i++];
  const need = (t:TokType, msg?:string) => { const k=take(); if (k.t!==t) throw new ParseError(msg||`Expected ${t}`, k.pos); return k; };

  function parseExpr(): Expr { return parseAdd(); }

  function parseAdd(): Expr {
    let node = parseMul();
    const parts: Expr[] = [node];
    while(peek().t==='op' && (peek().v==='+' || peek().v==='-')){
      const op = take().v!;
      const rhs = parseMul();
      if (op==='+') parts.push(rhs);
      else parts.push(AST.mul(AST.rat(-1n,1n), rhs));
    }
    return parts.length===1? parts[0] : AST.add(...parts);
  }

  function parseMul(): Expr {
    let node = parsePow();
    const parts: Expr[] = [node];
    while(peek().t==='op' && (peek().v==='*' || peek().v==='/')){
      const op = take().v!;
      const rhs = parsePow();
      if (op==='*') parts.push(rhs);
      else parts.push(AST.pow(rhs, AST.rat(-1n,1n))); // divide by rhs -> multiply by rhs^-1
    }
    return parts.length===1? parts[0] : AST.mul(...parts);
  }

  function parsePow(): Expr {
    let node = parsePrimary();
    if (peek().t==='op' && peek().v==='^'){
      take();
      const exp = parsePow(); // right-assoc
      node = AST.pow(node, exp);
    }
    return node;
  }

  function parsePrimary(): Expr {
    const t = peek();
    if (t.t==='num'){ take(); return AST.rat(BigInt(t.v!), 1n); }
    if (t.t==='lpar'){ take(); const e=parseExpr(); need('rpar', 'Expected )'); return e; }
    if (t.t==='ident'){
      const id = take().v!.toLowerCase();
      if (peek().t!=='lpar') throw new ParseError('Expected ( after function name', peek().pos);
      take();
      const arg = parseExpr();
      need('rpar', 'Expected ) after function argument');
      if (id==='sqrt') return AST.sqrt(arg);
      if (id==='cbrt') return AST.cbrt(arg);
      throw new ParseError(`Unknown function '${id}'`, t.pos);
    }
    throw new ParseError('Unexpected token', t.pos);
  }

  const ast = parseExpr();
  if (peek().t!=='eof') throw new ParseError('Trailing input', peek().pos);
  return ast;
}
