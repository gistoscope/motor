
import React, { useState } from 'react';
import { parse, print as printExpr } from '@motor/parser';
import { createEngine } from '@motor/core';

const eng = createEngine();

export default function App(){
  const [src, setSrc] = useState('sqrt(9) + 1/2 + 1/3');
  const [out, setOut] = useState('');
  const [ast, setAst] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onSimplify = () => {
    try{
      setErr(null);
      const e = parse(src);
      setAst(printExpr(e));
      const s = eng.simplify(e);
      setOut(printExpr(s));
    }catch(e:any){
      setAst('');
      setOut('');
      setErr(e.message || String(e));
    }
  }

  return (
    <div style={{fontFamily:'Inter, system-ui, sans-serif', padding:20, maxWidth:900, margin:'40px auto'}}>
      <h1>Motor — Stage-1 Demo</h1>
      <p>Exact rationals, symbolic radicals (perfect powers only). No decimals at Stage-1.</p>
      <div style={{display:'flex', gap:8}}>
        <input
          style={{flex:1, padding:10, fontSize:16, border:'1px solid #ddd', borderRadius:8}}
          value={src}
          onChange={e=>setSrc(e.target.value)}
          placeholder="Type expression, e.g. sqrt(12) + 2^3 / 3"
        />
        <button onClick={onSimplify} style={{padding:'10px 16px', fontSize:16, borderRadius:8}}>Simplify</button>
      </div>
      {err && <div style={{marginTop:12, color:'#c00'}}><strong>Error:</strong> {err}</div>}
      {!err && (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16}}>
          <div style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
            <div style={{fontWeight:600, marginBottom:8}}>AST (pretty)</div>
            <code>{ast}</code>
          </div>
          <div style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
            <div style={{fontWeight:600, marginBottom:8}}>Output</div>
            <code>{out}</code>
          </div>
        </div>
      )}
      <hr style={{margin:'24px 0'}}/>
      <p>Stage-1 policy: no decimal approximations, no radical factorization (e.g., sqrt(12) stays symbolic).</p>
    </div>
  );
}
