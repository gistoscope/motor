#!/usr/bin/env node
// MV-P03 canonical server for the Micro Viewer package.
// Serves static assets from the `public/` directory and falls back to index.html.

import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const root = resolve(moduleRoot, 'public');
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
]);

async function serveFile(filePath, res) {
  const mime = mimeTypes.get(extname(filePath)) ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
  return new Promise((resolvePromise, rejectPromise) => {
    createReadStream(filePath)
      .on('error', rejectPromise)
      .on('end', resolvePromise)
      .pipe(res);
  });
}

async function handleRequest(req, res) {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const candidatePath = resolve(root, '.' + requestedPath);

    if (!candidatePath.startsWith(root) || !existsSync(candidatePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    await serveFile(candidatePath, res);
  } catch (error) {
    console.error('[mv-p03] Unhandled error while serving request:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}

const port = Number.parseInt(process.env.PORT ?? '4173', 10);

createServer(handleRequest).listen(port, () => {
  console.log(`[mv-p03] micro-viewer server listening on http://localhost:${port}`);
});
