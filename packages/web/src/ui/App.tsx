import React, { useMemo, useState } from 'react';
import { parse, print as printExpr } from '@motor/parser';
import { createEngine } from '@motor/core';
import type { AppliedStep, Expr, Path, PolicyBundle } from '@motor/types';
import { bundles, profiles } from '@motor/tsa-policy';
import Pretty from '../render/Pretty';
import LearningModeSelector from './LearningModeSelector';
import { applyClick } from './ClickController';

const eng = createEngine();
const defaultSource = 'sqrt(9) + 1/2 + 1/3';

const initialExpr = (() => {
  try {
    const parsed = parse(defaultSource);
    return { expr: parsed, printed: printExpr(parsed) };
  } catch {
    return { expr: null, printed: '' };
  }
})();

const bundleCatalog: Record<string, PolicyBundle> = Object.entries(bundles).reduce((acc, [id, bundle]) => {
  acc[id] = bundle;
  return acc;
}, {} as Record<string, PolicyBundle>);

type ProfileId = keyof typeof profiles;

export default function App(){
  const [src, setSrc] = useState(defaultSource);
  const [expr, setExpr] = useState<Expr | null>(initialExpr.expr);
  const [teachExpr, setTeachExpr] = useState<Expr | null>(initialExpr.expr);
  const [out, setOut] = useState('');
  const [ast, setAst] = useState(initialExpr.printed);
  const [err, setErr] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<ProfileId>('beginner');
  const [highlight, setHighlight] = useState<Path | undefined>();
  const [history, setHistory] = useState<AppliedStep[]>([]);

  const loadExpression = (withSimplify: boolean) => {
    try{
      const parsed = parse(src);
      setExpr(parsed);
      setTeachExpr(parsed);
      setAst(printExpr(parsed));
      setHistory([]);
      setHighlight(undefined);
      setErr(null);
      if (withSimplify){
        const simplified = eng.simplify(parsed);
        setOut(printExpr(simplified));
      }else{
        setOut('');
      }
    }catch(e:any){
      setExpr(null);
      setTeachExpr(null);
      setAst('');
      setOut('');
      setHistory([]);
      setHighlight(undefined);
      setErr(e.message || String(e));
    }
  };

  const onLoad = () => loadExpression(false);
  const onSimplify = () => loadExpression(true);
  const onResetTeach = () => {
    if (expr){
      setTeachExpr(expr);
    }
    setHistory([]);
    setHighlight(undefined);
  };

  const activeProfile = profiles[profileId];

  const onSelectPath = (path: Path) => {
    if (!teachExpr) return;
    const result = applyClick(teachExpr, path, { profile: activeProfile, bundles: bundleCatalog });
    setHighlight(path);
    if (result.steps.length === 0) return;
    setTeachExpr(result.final);
    setHistory(prev => [...prev, ...result.steps]);
  };

  const prettyTeachExpr = useMemo(() => teachExpr, [teachExpr]);

  return (
    <div style={{fontFamily:'Inter, system-ui, sans-serif', padding:20, maxWidth:960, margin:'40px auto'}}>
      <h1>Motor — Stage-1 Demo</h1>
      <p>Exact rationals and symbolic radicals with a teaching-focused action rail. Teach-mode avoids evaluation and works directly on the AST.</p>
      <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <input
          style={{flex:1, minWidth:240, padding:10, fontSize:16, border:'1px solid #ddd', borderRadius:8}}
          value={src}
          onChange={e=>setSrc(e.target.value)}
          placeholder="Type expression, e.g. sqrt(12) + 2^3 / 3"
        />
        <button onClick={onLoad} style={{padding:'10px 16px', fontSize:16, borderRadius:8}}>Load expression</button>
        <button onClick={onSimplify} style={{padding:'10px 16px', fontSize:16, borderRadius:8}}>Simplify (core)</button>
        <button onClick={onResetTeach} style={{padding:'10px 16px', fontSize:16, borderRadius:8}}>Reset teach mode</button>
      </div>
      {err && <div style={{marginTop:12, color:'#c00'}}><strong>Error:</strong> {err}</div>}
      {!err && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:16, marginTop:16}}>
          <div style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
            <div style={{fontWeight:600, marginBottom:8}}>AST (pretty)</div>
            <code>{ast}</code>
          </div>
          <div style={{border:'1px solid #eee', borderRadius:8, padding:12}}>
            <div style={{fontWeight:600, marginBottom:8}}>Core output</div>
            <code>{out}</code>
          </div>
          <div style={{border:'1px solid #eee', borderRadius:8, padding:12, display:'flex', flexDirection:'column', gap:12}}>
            <LearningModeSelector value={profileId} onChange={setProfileId} />
            <div>
              <div style={{fontWeight:600, marginBottom:4}}>Teach mode canvas</div>
              <div style={{border:'1px solid #ddd', borderRadius:8, padding:12, minHeight:80}}>
                {prettyTeachExpr ? (
                  <Pretty expr={prettyTeachExpr} highlight={highlight} onSelect={onSelectPath} />
                ) : (
                  <span>Load a valid expression to begin.</span>
                )}
              </div>
            </div>
            <div>
              <div style={{fontWeight:600, marginBottom:4}}>Action history</div>
              {history.length === 0 ? (
                <p style={{margin:0, color:'#666'}}>Click any part of the expression to attempt a teaching step.</p>
              ) : (
                <ol style={{margin:0, paddingLeft:16, display:'flex', flexDirection:'column', gap:4}}>
                  {history.map((step, index) => (
                    <li key={`${step.action}-${index}`}>
                      <strong>{step.action}</strong>
                      <div style={{fontSize:12, color:'#555'}}>{printExpr(step.after)}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
      <hr style={{margin:'24px 0'}}/>
      <p>Stage-1 policy: no decimal approximations, no radical factorization. Teach mode only routes through TSA atoms.</p>
    </div>
  );
}
