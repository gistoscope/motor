#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const DEMO_ROOT = fileURLToPath(new URL('.', import.meta.url));
const WEB_ROOT = resolve(DEMO_ROOT, '..');
const REPO_ROOT = resolve(WEB_ROOT, '..', '..');
const SRC_ROOT = join(WEB_ROOT, 'src');
const PACKAGES_ROOT = join(REPO_ROOT, 'packages');
const NODE_MODULES_ROOT = join(REPO_ROOT, 'node_modules');
const PORT = 4000;

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
]);

function guessMime(filename, fallback = 'application/octet-stream') {
  return MIME_TYPES.get(extname(filename).toLowerCase()) ?? fallback;
}

function safeResolve(baseDir, requestedPath) {
  const resolved = resolve(baseDir, '.' + requestedPath);
  if (!resolved.startsWith(baseDir)) {
    return null;
  }
  return resolved;
}

function rewriteSpecifier(specifier, importerPath) {
  if (specifier.startsWith('.')) {
    const ext = extname(specifier);
    if (ext === '' || ext === '.ts' || ext === '.tsx') {
      return `${specifier.replace(/\.(ts|tsx)$/u, '')}.js`;
    }
    return specifier;
  }

  if (specifier.startsWith('@motor/')) {
    const rest = specifier.slice('@motor/'.length);
    const [pkg, ...segments] = rest.split('/');
    if (!pkg) return specifier;
    const targetSegments = segments.length > 0 ? segments : ['index.js'];
    return `/__packages/${pkg}/${targetSegments.join('/')}`;
  }

  if (specifier.startsWith('node:')) {
    return specifier;
  }

  if (specifier.startsWith('http://') || specifier.startsWith('https://')) {
    return specifier;
  }

  // Preserve absolute paths (e.g. /demo/main.js) untouched.
  if (specifier.startsWith('/')) {
    return specifier;
  }

  return specifier;
}

function rewriteImports(code, importerPath) {
  const sourceFile = ts.createSourceFile(
    pathToFileURL(importerPath).pathname,
    code,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.JS,
  );

  const replacements = [];

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
        const original = moduleSpecifier.text;
        const updated = rewriteSpecifier(original, importerPath);
        if (updated !== original) {
          replacements.push({
            start: moduleSpecifier.getStart(sourceFile) + 1,
            end: moduleSpecifier.getEnd() - 1,
            value: updated,
          });
        }
      }
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteral(arg)) {
        const original = arg.text;
        const updated = rewriteSpecifier(original, importerPath);
        if (updated !== original) {
          replacements.push({
            start: arg.getStart(sourceFile) + 1,
            end: arg.getEnd() - 1,
            value: updated,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);

  if (replacements.length === 0) {
    return code;
  }

  let result = code;
  replacements
    .sort((a, b) => b.start - a.start)
    .forEach((replacement) => {
      result =
        result.slice(0, replacement.start) +
        replacement.value +
        result.slice(replacement.end);
    });
  return result;
}

async function compileTypeScript(tsPath) {
  const source = await readFile(tsPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: tsPath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      sourceMap: false,
    },
    reportDiagnostics: false,
  });
  const rewritten = rewriteImports(transpiled.outputText, tsPath);
  return rewritten;
}

async function serveStatic(res, absolutePath) {
  const type = guessMime(absolutePath);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  createReadStream(absolutePath).pipe(res);
}

async function serveCssModule(res, cssPath) {
  const css = await readFile(cssPath, 'utf8');
  const code = `const css = ${JSON.stringify(css)};\n` +
    'const style = document.createElement("style");\n' +
    'style.setAttribute("data-demo-style", "viewer");\n' +
    'style.textContent = css;\n' +
    'document.head.appendChild(style);\n' +
    'export default css;\n';
  res.writeHead(200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(code);
}

async function serveSourceModule(res, requestPath) {
  const relativePath = requestPath.replace(/^\/src/u, '');
  const absoluteJs = safeResolve(SRC_ROOT, relativePath);
  if (!absoluteJs) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (existsSync(absoluteJs)) {
    await serveStatic(res, absoluteJs);
    return;
  }

  const tsCandidate = absoluteJs.replace(/\.js$/u, '.ts');
  const tsxCandidate = absoluteJs.replace(/\.js$/u, '.tsx');
  const sourcePath = existsSync(tsCandidate) ? tsCandidate : existsSync(tsxCandidate) ? tsxCandidate : null;

  if (!sourcePath) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  try {
    const code = await compileTypeScript(sourcePath);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(code);
  } catch (err) {
    console.error('[demo] Failed to compile', sourcePath, err);
    res.writeHead(500);
    res.end('Compilation failed');
  }
}

async function servePackageFile(res, requestPath) {
  const relativePath = requestPath.replace(/^\/__packages\//u, '');
  const absolutePath = safeResolve(PACKAGES_ROOT, `/${relativePath}`);
  if (!absolutePath || !existsSync(absolutePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const info = await stat(absolutePath);
  if (info.isDirectory()) {
    const indexPath = join(absolutePath, 'index.js');
    if (!existsSync(indexPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    await serveStatic(res, indexPath);
    return;
  }

  await serveStatic(res, absolutePath);
}

async function serveDemoAsset(res, requestPath) {
  const absolutePath = safeResolve(DEMO_ROOT, requestPath);
  if (!absolutePath || !existsSync(absolutePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const info = await stat(absolutePath);
  if (info.isDirectory()) {
    const indexPath = join(absolutePath, 'index.html');
    if (!existsSync(indexPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    await serveStatic(res, indexPath);
    return;
  }

  await serveStatic(res, absolutePath);
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

createServer(async (req, res) => {
  try {
    if (!req.url) {
      notFound(res);
      return;
    }
    const url = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === '/') {
      pathname = '/index.html';
    }

    if (pathname.startsWith('/__packages/')) {
      await servePackageFile(res, pathname);
      return;
    }

    if (pathname.startsWith('/src/')) {
      if (pathname.endsWith('.css')) {
        const cssPath = safeResolve(SRC_ROOT, pathname.replace(/^\/src/u, ''));
        if (!cssPath || !existsSync(cssPath)) {
          notFound(res);
          return;
        }
        await serveCssModule(res, cssPath);
        return;
      }

      await serveSourceModule(res, pathname);
      return;
    }

    if (pathname.startsWith('/node_modules/')) {
      const nodePath = safeResolve(NODE_MODULES_ROOT, pathname.replace(/^\/node_modules/u, ''));
      if (!nodePath || !existsSync(nodePath)) {
        notFound(res);
        return;
      }
      await serveStatic(res, nodePath);
      return;
    }

    await serveDemoAsset(res, pathname);
  } catch (err) {
    console.error('[demo] error while serving request', req.url, err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
}).listen(PORT, () => {
  console.log(`[demo] Serving web playground at http://localhost:${PORT}`);
});
