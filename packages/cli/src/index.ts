
#!/usr/bin/env node
import { parse, print } from '@motor/parser';
import { createEngine } from '@motor/core';

const args = process.argv.slice(2);
const demo = args.includes('--demo');
const showAst = args.includes('--ast');
const exprArg = args.find(a => !a.startsWith('-'));

const eng = createEngine();

function demoRun() {
  const expr = '1/2 + 1/3 + sqrt(9) + sqrt(12)';
  try {
    const ast = parse(expr);
    if (showAst) console.log('AST:', print(ast));
    const out = eng.simplify(ast);
    console.log( print(out) );
  } catch (e:any) {
    console.error('Parse/Eval error:', e.message);
    process.exit(2);
  }
}

function parseRun(expr: string) {
  try {
    const ast = parse(expr);
    if (showAst) console.log('AST:', print(ast));
    const out = eng.simplify(ast);
    console.log( print(out) );
  } catch (e:any) {
    console.error('Parse/Eval error:', e.message);
    process.exit(2);
  }
}

if (demo || !exprArg) { demoRun(); }
else { parseRun(exprArg); }
